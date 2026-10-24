# TestSprite Hackathon Season 4 Rules & Constraints

## Core Mandate: "One Week. One Loop. Every PR."

### Project Constraints
1. **Architecture**: Must be a Next.js web application utilizing App Router, TypeScript, and Tailwind CSS.
2. **Artifact Directory**: Final repository must contain `testsprite_tests/` containing test plans, artifacts, and execution evidence.
3. **Loop Verification File**: Must generate `LOOP.md` documenting a minimum 3-iteration write -> verify -> fix loop.
4. **Comprehensive Documentation**: Must generate `README.md` detailing the application architecture, problem solved, Vercel preview URL placeholder, and TestSprite test suite coverage.
5. **CI/CD Pipeline**: GitHub Action `.github/workflows/testsprite.yml` running the TestSprite verification check on every pull request against dynamically generated Vercel preview URLs.

### Operational Protocols
- **Hybrid 3-File Task Model**: Track tasks using `- [ ]` (uncompleted), `- [/]` (in-progress), and `- [x]` (completed) with unique HTML comment IDs (`<!-- task-id -->`). Update `task.md` before moving between architectural steps.
- **UI Aesthetic Directive**: Futuristic technical aesthetic utilizing dark slate backgrounds (slate-950), glassmorphism paneling (`backdrop-blur`), vibrant neon accents (cyan `#06b6d4` and purple `#a855f7`).
- **Idempotency Guarantee**: Formally verify $\Phi(\Phi(S_t, E_{\text{async}}), E_{\text{async}}) = \Phi(S_t, E_{\text{async}})$.
- **Vercel Hostname Constraints**: Account for 63-character hostname limit by enforcing concise branch names (`aetherweave-git-${{ github.head_ref }}-username.vercel.app`).
