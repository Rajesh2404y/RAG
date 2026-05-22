"""
Conversation memory manager — converts stored messages to LangChain message objects.
"""
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class ConversationMemoryManager:
    def build_history(self, messages: list[dict]) -> list:
        history = []
        for msg in messages:
            if msg["role"] == "user":
                history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                history.append(AIMessage(content=msg["content"]))
            elif msg["role"] == "system":
                history.append(SystemMessage(content=msg["content"]))
        return history
