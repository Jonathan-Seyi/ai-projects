# Project quality and contribution guide

This repository is a portfolio of independently documented, reproducible software projects. Every project should be easy for a recruiter or developer to understand and try.

## Each project should include

1. **Problem statement:** Who benefits and what problem is solved.
2. **Features:** Specific, implemented functionality (avoid promises presented as complete).
3. **Technology choices:** Languages, dependencies, and any paid services.
4. **Quick start:** Prerequisites, installation, configuration, and exact run command.
5. **Example usage:** Sample input and expected output, with screenshots only if relevant.
6. **Testing:** How to run tests and what is covered.
7. **Limitations and next steps:** Known tradeoffs and potential enhancements.
8. **Security:** Never commit secrets, user resumes, private support tickets, or API credentials.

## Suggested project README template

```markdown
# Project name

One-sentence summary.

## Problem
Describe the real-world use case.

## Features
- Implemented feature 1
- Implemented feature 2

## Tech stack
List key technologies and why they were selected.

## Getting started
1. Install prerequisites.
2. Copy .env.example to .env (if needed).
3. Install dependencies.
4. Run the app.

## Usage
Provide a realistic example.

## Tests
Give the test command and note any required services.

## Limitations
What does the project not do yet?

## Roadmap
- [ ] Next useful improvement
```

## Development workflow

- Create a descriptive feature branch from `main`.
- Keep changes narrowly scoped and write clear commit messages.
- Run relevant tests or document why they could not be run.
- Open a pull request describing the change, verification, and remaining limitations.
- Prefer maintainable, understandable code over unnecessary dependencies.
- Do not commit generated build artifacts, virtual environments, large model weights, or API keys.

## Portfolio roadmap

The following are ideas, not claims that these features already exist:

| Project | Possible improvement | Value |
| --- | --- | --- |
| AI Resume Match | Add transparent scoring criteria and unit tests | More trustworthy comparisons |
| AI Support Ticket Assistant | Add priority evaluation with sample tickets | Demonstrates quality measurement |
| AI Notes Chat | Add retrieval citations and a small evaluation set | Makes responses auditable |
| Future non-AI project | Build a documented REST API with tests | Demonstrates backend fundamentals |

## Safety and privacy

Use synthetic or authorized sample data. If a project calls an external AI API, make that explicit and handle errors, timeouts, and usage costs. Never describe an LLM-generated answer as verified ground truth without an independent check.
