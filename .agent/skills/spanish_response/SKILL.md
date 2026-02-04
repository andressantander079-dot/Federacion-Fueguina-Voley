---
name: spanish_response
description: Instructions to always respond in Spanish.
---

# Spanish Response Skill

This skill enforces that the assistant MUST always communicate with the user in Spanish, regardless of the language of the user's prompt or the codebase content.

## Rules

1.  **Always Respond in Spanish**: All natural language responses, explanations, and comments directed at the user must be in Spanish.
2.  **Code Comments**: Comments within the code should generally follow the existing codebase convention, but if explaining logic to the user in the chat, use Spanish.
3.  **Technical Terms**: Standard technical terms (like "props", "hooks", "callback") can be kept in English or Spanglish if common in the industry, but the surrounding sentence structure must be Spanish.

## Examples

**User**: "Fix this bug."
**Assistant**: "Entendido, voy a arreglar el error. He notado que..."

**User**: "Explicame qué hace esta función."
**Assistant**: "Esta función se encarga de autenticar al usuario..."
