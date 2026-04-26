# Senior Interviewer AI

A robust, production-ready interview platform that uses Retrieval-Augmented Generation (RAG) to conduct deep technical interviews based on a GitHub repository or documentation link.

## Features

- **Data Ingestion**: Scrapes content from GitHub repositories or any webpage.
- **RAG Pipeline**: Chunks text, generates embeddings using Gemini, and stores them in an in-memory vector database.
- **AI Interviewer**: Acts as a strict senior developer, asking context-aware questions about architecture, trade-offs, and scalability.
- **Answer Evaluation**: Scores candidate responses (0-10) and provides detailed feedback and ideal answer references.
- **Technical Dashboard**: A polished, professional UI inspired by high-end developer tools.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Axios.
- **Backend**: Node.js, Express, Cheerio.
- **AI**: Google Gemini 3.1 Pro, LangChain (JS).

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Ensure `GEMINI_API_KEY` is set in your environment.

3. **Run the Application**:
   ```bash
   npm run dev
   ```

## Usage

1. Enter a GitHub URL (e.g., `https://github.com/facebook/react`) or a doc link.
2. Click **SCRAPE** to initialize the context.
3. Choose a difficulty level.
4. Respond to the AI's technical questions.
5. Review the feedback and scores for each answer.

## Architecture

- `/server.ts`: Express server with Vite middleware.
- `/server/services/scraper.ts`: Content extraction logic.
- `/src/services/rag.ts`: Chunking and vector search logic.
- `/src/services/gemini.ts`: AI generation and evaluation logic.
- `/src/App.tsx`: Main user interface.
