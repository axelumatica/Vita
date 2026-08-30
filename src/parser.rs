use crate::models::{EmotionalEnergy, Status, Task};
use crate::openrouter::{self, OpenRouterError};
use serde::Deserialize;
use thiserror::Error;

/// System prompt instructing the model to extract a structured `Task` from a
/// raw voice transcript. The model is told to return only the JSON object —
/// no prose, no markdown fences — so the response can be parsed directly.
pub const PARSER_SYSTEM_PROMPT: &str = "You are a voice-transcript parser for a productivity app. \
Given a raw spoken transcript, extract a single JSON object matching this Rust Task schema:\n\
{\n\
  \"macro_title\": string,          // high-level title describing the task as a whole\n\
  \"micro_step_active\": string,    // the smallest executable next step\n\
  \"estimated_minutes\": integer,   // estimated minutes to complete the task\n\
  \"emotional_energy\": \"low\" | \"medium\" | \"high\",\n\
  \"tags\": [string, ...],         // free-form categorization tags\n\
  \"vault_summary\": string         // short summary for the user's vault\n\
}\n\
Return ONLY the JSON object. No prose, no markdown, no code fences.";

#[derive(Error, Debug)]
pub enum ParseError {
    #[error("openrouter error: {0}")]
    OpenRouter(#[from] OpenRouterError),

    #[error("model returned no JSON content")]
    Empty,

    #[error("failed to parse model output as Task: {0}")]
    Json(#[from] serde_json::Error),
}

/// The subset of `Task` fields the parser fills from the transcript.
/// The model is asked to return the same shape so we deserialize directly.
#[derive(Debug, Deserialize)]
struct ParsedTask {
    macro_title: String,
    micro_step_active: String,
    estimated_minutes: u32,
    emotional_energy: EmotionalEnergy,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    vault_summary: String,
}

impl From<ParsedTask> for Task {
    fn from(p: ParsedTask) -> Self {
        Task {
            macro_title: p.macro_title,
            micro_step_active: p.micro_step_active,
            status: Status::Active,
            estimated_minutes: p.estimated_minutes,
            emotional_energy: p.emotional_energy,
            tags: p.tags,
            vault_summary: p.vault_summary,
        }
    }
}

/// Send a voice transcript to OpenRouter and parse the response into a `Task`.
///
/// Uses `PARSER_SYSTEM_PROMPT` as the system prompt and the raw transcript as
/// the user prompt. The model is expected to reply with a bare JSON object;
/// we trim whitespace and parse it via `serde_json`.
pub async fn transcript_to_task(
    transcript: &str,
    api_key: &str,
) -> Result<Task, ParseError> {
    let raw = openrouter::submit_prompt(PARSER_SYSTEM_PROMPT, transcript, api_key).await?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(ParseError::Empty);
    }
    let parsed: ParsedTask = serde_json::from_str(trimmed)?;
    Ok(parsed.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_prompt_mentions_micro_step() {
        assert!(PARSER_SYSTEM_PROMPT.contains("micro_step_active"));
    }

    #[test]
    fn system_prompt_mentions_emotional_energy() {
        assert!(PARSER_SYSTEM_PROMPT.contains("emotional_energy"));
    }

    #[test]
    fn parsed_task_into_task_copies_fields() {
        let parsed = ParsedTask {
            macro_title: "Refactor auth".to_string(),
            micro_step_active: "Extract token validation".to_string(),
            estimated_minutes: 45,
            emotional_energy: EmotionalEnergy::Medium,
            tags: vec!["rust".into(), "auth".into()],
            vault_summary: "Pulls JWT logic out of the request handler.".to_string(),
        };
        let task: Task = parsed.into();
        assert_eq!(task.macro_title, "Refactor auth");
        assert_eq!(task.micro_step_active, "Extract token validation");
        assert_eq!(task.estimated_minutes, 45);
        assert_eq!(task.emotional_energy, EmotionalEnergy::Medium);
        assert_eq!(task.tags, vec!["rust", "auth"]);
        assert_eq!(
            task.vault_summary,
            "Pulls JWT logic out of the request handler."
        );
    }
}
