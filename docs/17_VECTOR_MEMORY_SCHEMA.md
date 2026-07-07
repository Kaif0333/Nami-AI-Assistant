# 17 — Vector Memory Schema

## Goal

Enable semantic memory search.

## Memory flow

```text
User asks Nami to remember
→ Nami classifies memory type
→ Stores structured memory
→ Creates embedding
→ Saves embedding in memory_embeddings
```

## Retrieval flow

```text
User asks question
→ Query embedding generated
→ Similar memories retrieved
→ Relevance filtered
→ Context sent to agent
```

## Memory types

- profile
- project
- job
- client
- preference
- conversation
- document
- automation

## Relevance rules

Do not blindly inject all memory. Retrieve only relevant memories.

## Forget/update rules

User must be able to:
- View memory
- Edit memory
- Delete memory
- Disable memory type
