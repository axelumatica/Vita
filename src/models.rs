use serde::{Deserialize, Serialize};

// Re-export EmotionalEnergy for use by other structs
pub use EmotionalEnergy as Energy;

/// Core task object representing a single unit of work in Vita.
///
/// Fields map to the SQLite schema; `rusqlite` uses the explicit
/// `FromRow` impl below for deserialization, and `serde` provides
/// JSON (de)serialization for API transport.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// High-level title describing the task as a whole.
    pub macro_title: String,

    /// The currently active micro-step (smallest executable unit).
    pub micro_step_active: String,

    /// Lifecycle status of the task.
    pub status: Status,

    /// Emotional energy required: `low`, `medium`, or `high`.
    pub emotional_energy: EmotionalEnergy,

    /// Estimated minutes to complete the task.
    pub estimated_minutes: u32,

    /// Free-form tags for categorization and filtering.
    pub tags: Vec<String>,

    /// Summary stored in the user's vault for this task.
    pub vault_summary: String,
}

/// Lifecycle status of a task. Serialized as a lowercase string.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Active,
    Paused,
    Done,
    Archived,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Active => "active",
            Status::Paused => "paused",
            Status::Done => "done",
            Status::Archived => "archived",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "active" => Some(Status::Active),
            "paused" => Some(Status::Paused),
            "done" => Some(Status::Done),
            "archived" => Some(Status::Archived),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for Status {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = value.as_str()?;
        Status::from_str(s).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(format!("invalid status: {s}").into())
        })
    }
}

impl rusqlite::types::ToSql for Status {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(self.as_str().into())
    }
}

/// A journal entry written by the user. Linked optionally to a task via
/// `task_macro_title` (empty string when standalone).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    /// Unix timestamp (seconds) when the entry was created.
    pub timestamp: i64,

    /// Free-form body of the entry.
    pub body: String,

    /// `macro_title` of the linked `Task`, or empty if standalone.
    pub task_macro_title: String,

    /// Emotional energy the user felt while writing this entry.
    pub emotional_energy: EmotionalEnergy,
}

impl JournalEntry {
    /// Read a `JournalEntry` from a `rusqlite::Row` using the schema's column order:
    /// `timestamp, body, task_macro_title, emotional_energy`.
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let energy_str: String = row.get(3)?;
        let energy = EmotionalEnergy::from_str(&energy_str).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(
                3,
                rusqlite::types::Type::Text,
                format!("invalid emotional_energy: {energy_str}").into(),
            )
        })?;

        Ok(JournalEntry {
            timestamp: row.get(0)?,
            body: row.get(1)?,
            task_macro_title: row.get(2)?,
            emotional_energy: energy,
        })
    }
}

/// An item the user has tucked away in their vault for later reference.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultItem {
    /// Human-readable title of the vault item.
    pub title: String,

    /// Optional `macro_title` of the `Task` this item belongs to.
    pub task_macro_title: String,

    /// Free-form body or summary text.
    pub content: String,

    /// Lifecycle status of the vault item.
    pub status: Status,
}

impl VaultItem {
    /// Read a `VaultItem` from a `rusqlite::Row` using the schema's column order:
    /// `title, task_macro_title, content, status`.
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let status_str: String = row.get(3)?;
        let status = Status::from_str(&status_str).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(
                3,
                rusqlite::types::Type::Text,
                format!("invalid status: {status_str}").into(),
            )
        })?;

        Ok(VaultItem {
            title: row.get(0)?,
            task_macro_title: row.get(1)?,
            content: row.get(2)?,
            status,
        })
    }
}

/// Emotional energy cost of a task. Serialized as a lowercase string.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EmotionalEnergy {
    Low,
    Medium,
    High,
}

impl EmotionalEnergy {
    /// String form used in the SQLite column.
    pub fn as_str(&self) -> &'static str {
        match self {
            EmotionalEnergy::Low => "low",
            EmotionalEnergy::Medium => "medium",
            EmotionalEnergy::High => "high",
        }
    }

    /// Parse from the SQLite column form.
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "low" => Some(EmotionalEnergy::Low),
            "medium" => Some(EmotionalEnergy::Medium),
            "high" => Some(EmotionalEnergy::High),
            _ => None,
        }
    }
}

impl rusqlite::types::FromSql for EmotionalEnergy {
    fn column_result(value: rusqlite::types::ValueRef<'_>) -> rusqlite::types::FromSqlResult<Self> {
        let s = value.as_str()?;
        EmotionalEnergy::from_str(s).ok_or_else(|| {
            rusqlite::types::FromSqlError::Other(format!("invalid emotional_energy: {s}").into())
        })
    }
}

impl rusqlite::types::ToSql for EmotionalEnergy {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        Ok(self.as_str().into())
    }
}

/// Read a `Task` from a `rusqlite::Row` using the schema's column order:
/// `macro_title, micro_step_active, status, emotional_energy, estimated_minutes, tags, vault_summary`.
impl Task {
    pub fn from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Self> {
        let status_str: String = row.get(2)?;
        let status = Status::from_str(&status_str).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(
                2,
                rusqlite::types::Type::Text,
                format!("invalid status: {status_str}").into(),
            )
        })?;

        let energy_str: String = row.get(3)?;
        let energy = EmotionalEnergy::from_str(&energy_str).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(
                3,
                rusqlite::types::Type::Text,
                format!("invalid emotional_energy: {energy_str}").into(),
            )
        })?;

        Ok(Task {
            macro_title: row.get(0)?,
            micro_step_active: row.get(1)?,
            status,
            emotional_energy: energy,
            estimated_minutes: row.get::<_, u32>(4)?,
            tags: row.get::<_, String>(5)?
                .split(',')
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect(),
            vault_summary: row.get(6)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn energy_roundtrip() {
        for e in [EmotionalEnergy::Low, EmotionalEnergy::Medium, EmotionalEnergy::High] {
            assert_eq!(EmotionalEnergy::from_str(e.as_str()), Some(e));
        }
        assert_eq!(EmotionalEnergy::from_str("nope"), None);
    }

    #[test]
    fn status_roundtrip() {
        for s in [Status::Active, Status::Paused, Status::Done, Status::Archived] {
            assert_eq!(Status::from_str(s.as_str()), Some(s));
        }
        assert_eq!(Status::from_str("nope"), None);
    }

    #[test]
    fn task_serde_roundtrip() {
        let task = Task {
            macro_title: "Refactor auth".to_string(),
            micro_step_active: "Extract token validation".to_string(),
            status: Status::Active,
            emotional_energy: EmotionalEnergy::Medium,
            estimated_minutes: 45,
            tags: vec!["rust".into(), "auth".into()],
            vault_summary: "Pulls JWT logic out of the request handler.".to_string(),
        };
        let json = serde_json::to_string(&task).unwrap();
        let back: Task = serde_json::from_str(&json).unwrap();
        assert_eq!(back.macro_title, task.macro_title);
        assert_eq!(back.status, task.status);
        assert_eq!(back.emotional_energy, task.emotional_energy);
    }

    #[test]
    fn journal_entry_serde_roundtrip() {
        let entry = JournalEntry {
            timestamp: 1700000000,
            body: "Feeling productive today.".to_string(),
            task_macro_title: "Refactor auth".to_string(),
            emotional_energy: EmotionalEnergy::High,
        };
        let json = serde_json::to_string(&entry).unwrap();
        let back: JournalEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(back.timestamp, entry.timestamp);
        assert_eq!(back.emotional_energy, entry.emotional_energy);
    }

    #[test]
    fn vault_item_serde_roundtrip() {
        let item = VaultItem {
            title: "Auth RFC".to_string(),
            task_macro_title: "Refactor auth".to_string(),
            content: "JWT validation design doc.".to_string(),
            status: Status::Archived,
        };
        let json = serde_json::to_string(&item).unwrap();
        let back: VaultItem = serde_json::from_str(&json).unwrap();
        assert_eq!(back.title, item.title);
        assert_eq!(back.status, item.status);
    }
}
