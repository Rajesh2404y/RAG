"""
Centralized prompt templates for the RAG pipeline.
Keeping prompts here makes them easy to version and A/B test.
"""
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


class RAGPrompts:
    QA_SYSTEM = (
        "You are a precise enterprise document assistant. Answer ONLY from the provided context. "
        "Answer immediately in a concise way, usually under 180 words unless the user asks for detail. "
        "If the context is insufficient, say you do not have enough information. "
        "Use source markers like [1], [2] when referring to evidence and include document/page details when useful. "
        "Do not show reasoning steps, preambles, or invented facts, policies, numbers, dates, or citations.\n\n"
        "Context:\n{context}"
    )

    @classmethod
    def qa_prompt(cls) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages([
            ("system", cls.QA_SYSTEM),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])

    DIRECT_SYSTEM = (
        "You are a helpful enterprise AI assistant. Answer naturally and directly. "
        "Use documents only when they are provided by the retrieval pipeline; otherwise answer from general knowledge. "
        "Be concise, accurate, and explicit when something is uncertain."
    )

    @classmethod
    def direct_prompt(cls) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages([
            ("system", cls.DIRECT_SYSTEM),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])

    CONDENSE_SYSTEM = (
        "Given the chat history and a follow-up question, rephrase the follow-up question "
        "to be a standalone question that captures all necessary context."
    )

    @classmethod
    def condense_prompt(cls) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages([
            ("system", cls.CONDENSE_SYSTEM),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])
