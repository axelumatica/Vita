use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const DEFAULT_MODEL: &str = "openrouter/free";
pub const FALLBACK_MODEL: &str = "meta-llama/llama-3.3-70b-instruct:free";

#[derive(Error, Debug)]
pub enum OpenRouterError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("API returned non-OK status {status}: {message}")]
    Api { status: u16, message: String },

    #[error("response missing 'choices' field")]
    MissingChoices,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

/// Payload for a chat completions request.
#[derive(Debug, Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: Vec<ChatMessage>,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Option<Vec<ChatChoice>>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatContent,
}

#[derive(Debug, Deserialize)]
struct ChatContent {
    content: Option<String>,
}

/// Submit a chat prompt to OpenRouter and return the raw JSON response.
///
/// Tries `DEFAULT_MODEL` first; falls back to `FALLBACK_MODEL` on 422 error.
/// Both `system_prompt` and `user_prompt` are required and non-empty.
pub async fn submit_prompt(
    system_prompt: &str,
    user_prompt: &str,
    api_key: &str,
) -> Result<String, OpenRouterError> {
    if system_prompt.is_empty() {
        return Err(OpenRouterError::Api {
            status: 400,
            message: "system_prompt must be non-empty".to_string(),
        });
    }
    if user_prompt.is_empty() {
        return Err(OpenRouterError::Api {
            status: 400,
            message: "user_prompt must be non-empty".to_string(),
        });
    }

    let models = [DEFAULT_MODEL, FALLBACK_MODEL];

    for model in &models {
        let payload = ChatRequest {
            model: *model,
            messages: vec![
                ChatMessage {
                    role: "system",
                    content: system_prompt.to_string(),
                },
                ChatMessage {
                    role: "user",
                    content: user_prompt.to_string(),
                },
            ],
        };

        let client = reqwest::Client::new();
        let response = client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {api_key}"))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if response.status() == reqwest::StatusCode::UNPROCESSABLE_ENTITY {
            continue;
        }

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = response.text().await.unwrap_or_default();
            return Err(OpenRouterError::Api { status, message });
        }

        let body: ChatResponse = response.json().await?;
        let content = body
            .choices
            .and_then(|c| c.into_iter().next())
            .map(|c| c.message.content)
            .flatten()
            .ok_or(OpenRouterError::MissingChoices)?;

        return Ok(content);
    }

    Err(OpenRouterError::Api {
        status: 422,
        message: "all models returned 422".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_model_is_free() {
        assert!(DEFAULT_MODEL.contains("free"));
    }

    #[test]
    fn fallback_model_is_llama() {
        assert!(FALLBACK_MODEL.contains("llama"));
    }

    #[tokio::test]
    async fn submit_prompt_rejects_empty_system() {
        let result = submit_prompt("", "hello", "fake-key").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn submit_prompt_rejects_empty_user() {
        let result = submit_prompt("system", "", "fake-key").await;
        assert!(result.is_err());
    }
}
