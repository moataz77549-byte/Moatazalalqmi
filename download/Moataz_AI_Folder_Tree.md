# Moataz AI — Folder Structure
Generated: 2026-06-26 23:56:48

```
moataz-ai/
├── .env
├── .env.example
├── .github
├── .gitignore
├── Caddyfile
├── Dockerfile
├── agent-ctx
│   └── task-001-main-agent.md
├── bun.lock
├── components.json
├── db
│   └── custom.db
├── dev.log
├── docker-compose.yml
├── download
│   ├── Moataz_AI_Engineering_Blueprint.pdf
│   ├── Moataz_AI_Engineering_Blueprint_v2.pdf
│   ├── README.md
│   ├── moataz_chat.png
│   ├── moataz_dashboard.png
│   ├── moataz_hero.png
│   ├── moataz_projects.png
│   └── moataz_settings.png
├── eslint.config.mjs
├── examples
│   └── websocket
│       ├── frontend.tsx
│       └── server.ts
├── mini-services
│   └── .gitkeep
├── monitoring
│   └── prometheus.yml
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── prisma
│   └── schema.prisma
├── public
│   ├── logo.svg
│   └── robots.txt
├── scripts
│   ├── generate_reports.py
│   ├── moataz_blueprint.py
│   └── moataz_blueprint_v2.py
├── skills
│   ├── ASR
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── asr.ts
│   ├── LLM
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── chat.ts
│   ├── TTS
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── tts.ts
│   ├── VLM
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── vlm.ts
│   ├── agent-browser
│   │   └── SKILL.md
│   ├── ai-news-collectors
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   └── references
│   │       └── sources.md
│   ├── aminer-academic-search
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── aminer.py
│   ├── aminer-daily-paper
│   │   ├── README.md
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── recommend.py
│   ├── aminer-free-academic
│   │   ├── SKILL.md
│   │   ├── evals
│   │   │   └── evals.json
│   │   └── references
│   │       └── api-catalog.md
│   ├── anti-pua
│   │   └── SKILL.md
│   ├── auto-target-tracker
│   │   └── SKILL.md
│   ├── blog-writer
│   │   ├── 2024-02-17-radical-transparency-sales.md
│   │   ├── 2024-02-17-raycast-spotlight-superpowers.md
│   │   ├── 2024-02-17-short-form-content-marketing.md
│   │   ├── 2024-02-17-typing-speed-benefits.md
│   │   ├── 2024-03-14-effective-ai-prompts.md
│   │   ├── 2024-11-08-ai-revolutionizing-entry-level-sales.md
│   │   ├── 2025-11-12-why-ai-art-is-useless.md
│   │   ├── README.md
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── manage_examples.py
│   │   └── style-guide.md
│   ├── charts
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── _rules.md
│   │   │   ├── d3.md
│   │   │   ├── echarts.md
│   │   │   ├── matplotlib.md
│   │   │   ├── mermaid.md
│   │   │   ├── mindmap-css.md
│   │   │   ├── playwright-css.md
│   │   │   ├── radial-grid.md
│   │   │   └── seaborn.md
│   │   └── setup.sh
│   ├── cheat-sheet
│   │   └── SKILL.md
│   ├── coding-agent
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── criteria.md
│   │   ├── execution.md
│   │   ├── memory-template.md
│   │   ├── planning.md
│   │   ├── state.md
│   │   └── verification.md
│   ├── content-strategy
│   │   ├── SKILL.md
│   │   └── _meta.json
│   ├── contentanalysis
│   │   ├── ExtractWisdom
│   │   │   ├── SKILL.md
│   │   │   └── Workflows
│   │   │       └── Extract.md
│   │   └── SKILL.md
│   ├── design
│   │   ├── INDEX.md
│   │   ├── SKILL.md
│   │   ├── canvas-and-device.md
│   │   ├── content-page.md
│   │   ├── deck.md
│   │   ├── design-system-generation.md
│   │   ├── design-system-reference.md
│   │   ├── design-systems
│   │   │   ├── INDEX.md
│   │   │   ├── TAG-VOCABULARY.md
│   │   │   ├── brand-inspiration
│   │   │   │   ├── airbnb
│   │   │   │   ├── airtable
│   │   │   │   ├── apple
│   │   │   │   ├── arc
│   │   │   │   ├── binance
│   │   │   │   ├── bmw
│   │   │   │   ├── bmw-m
│   │   │   │   ├── bugatti
│   │   │   │   ├── cal
│   │   │   │   ├── canva
│   │   │   │   ├── cisco
│   │   │   │   ├── claude
│   │   │   │   ├── clay
│   │   │   │   ├── clickhouse
│   │   │   │   ├── cohere
│   │   │   │   ├── coinbase
│   │   │   │   ├── composio
│   │   │   │   ├── cursor
│   │   │   │   ├── discord
│   │   │   │   ├── duolingo
│   │   │   │   ├── elevenlabs
│   │   │   │   ├── expo
│   │   │   │   ├── ferrari
│   │   │   │   ├── figma
│   │   │   │   ├── framer
│   │   │   │   ├── github
│   │   │   │   ├── hashicorp
│   │   │   │   ├── huggingface
│   │   │   │   ├── ibm
│   │   │   │   ├── intercom
│   │   │   │   ├── kami
│   │   │   │   ├── kraken
│   │   │   │   ├── lamborghini
│   │   │   │   ├── linear-app
│   │   │   │   ├── loom
│   │   │   │   ├── lovable
│   │   │   │   ├── mastercard
│   │   │   │   ├── meta
│   │   │   │   ├── minimax
│   │   │   │   ├── mintlify
│   │   │   │   ├── miro
│   │   │   │   ├── mistral-ai
│   │   │   │   ├── mistral.ai
│   │   │   │   ├── mongodb
│   │   │   │   ├── nike
│   │   │   │   ├── notion
│   │   │   │   ├── nvidia
│   │   │   │   ├── ollama
│   │   │   │   ├── openai
│   │   │   │   ├── opencode-ai
│   │   │   │   ├── opencode.ai
│   │   │   │   ├── perplexity
│   │   │   │   ├── pinterest
│   │   │   │   ├── playstation
│   │   │   │   ├── posthog
│   │   │   │   ├── raycast
│   │   │   │   ├── renault
│   │   │   │   ├── replicate
│   │   │   │   ├── resend
│   │   │   │   ├── revolut
│   │   │   │   ├── runwayml
│   │   │   │   ├── sanity
│   │   │   │   ├── sentry
│   │   │   │   ├── shopify
│   │   │   │   ├── slack
│   │   │   │   ├── spacex
│   │   │   │   ├── spotify
│   │   │   │   ├── starbucks
│   │   │   │   ├── stripe
│   │   │   │   ├── supabase
│   │   │   │   ├── superhuman
│   │   │   │   ├── tesla
│   │   │   │   ├── theverge
│   │   │   │   ├── together-ai
│   │   │   │   ├── together.ai
│   │   │   │   ├── uber
│   │   │   │   ├── vercel
│   │   │   │   ├── vodafone
│   │   │   │   ├── voltagent
│   │   │   │   ├── warp
│   │   │   │   ├── webex
│   │   │   │   ├── webflow
│   │   │   │   ├── wechat
│   │   │   │   ├── wired
│   │   │   │   ├── wise
│   │   │   │   ├── x-ai
│   │   │   │   ├── x.ai
│   │   │   │   ├── xiaohongshu
│   │   │   │   └── zapier
│   │   │   ├── index.json
│   │   │   └── style-skills
│   │   │       ├── agentic
│   │   │       ├── ant
│   │   │       ├── application
│   │   │       ├── artistic
│   │   │       ├── atelier-zero
│   │   │       ├── bento
│   │   │       ├── bold
│   │   │       ├── brutalism
│   │   │       ├── cafe
│   │   │       ├── claude
│   │   │       ├── claymorphism
│   │   │       ├── clean
│   │   │       ├── codex
│   │   │       ├── colorful
│   │   │       ├── contemporary
│   │   │       ├── corporate
│   │   │       ├── cosmic
│   │   │       ├── creative
│   │   │       ├── dashboard
│   │   │       ├── default
│   │   │       ├── dithered
│   │   │       ├── doodle
│   │   │       ├── dramatic
│   │   │       ├── editorial
│   │   │       ├── elegant
│   │   │       ├── energetic
│   │   │       ├── enterprise
│   │   │       ├── expressive
│   │   │       ├── fantasy
│   │   │       ├── fiction
│   │   │       ├── flat
│   │   │       ├── friendly
│   │   │       ├── futuristic
│   │   │       ├── glassmorphism
│   │   │       ├── gradient
│   │   │       ├── hud
│   │   │       ├── immersive
│   │   │       ├── impeccable
│   │   │       ├── index.json
│   │   │       ├── levels
│   │   │       ├── lingo
│   │   │       ├── luxury
│   │   │       ├── material
│   │   │       ├── matrix
│   │   │       ├── minimal
│   │   │       ├── mission-control
│   │   │       ├── modern
│   │   │       ├── mono
│   │   │       ├── neobrutalism
│   │   │       ├── neon
│   │   │       ├── neumorphism
│   │   │       ├── pacman
│   │   │       ├── paper
│   │   │       ├── parchment
│   │   │       ├── perspective
│   │   │       ├── premium
│   │   │       ├── professional
│   │   │       ├── publication
│   │   │       ├── refined
│   │   │       ├── retro
│   │   │       ├── riso
│   │   │       ├── sega
│   │   │       ├── shadcn
│   │   │       ├── simple
│   │   │       ├── sketch
│   │   │       ├── skeumorphism
│   │   │       ├── sleek
│   │   │       ├── spacious
│   │   │       ├── storytelling
│   │   │       ├── terracotta
│   │   │       ├── tetris
│   │   │       ├── totality-festival
│   │   │       ├── trading-terminal
│   │   │       ├── urdu
│   │   │       ├── vibrant
│   │   │       ├── vintage
│   │   │       └── warm-editorial
│   │   ├── design-templates
│   │   │   ├── INDEX.md
│   │   │   ├── ascii-cosmos
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── reference.html
│   │   │   │   ├── styles.md
│   │   │   │   └── template.html
│   │   │   ├── audio-jingle
│   │   │   │   ├── SKILL.md
│   │   │   │   └── music-player.html
│   │   │   ├── blog-post
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── qiye-wildstay.html
│   │   │   │   └── 肌肤专题｜关于屏障的一次重读.html
│   │   │   ├── dashboard
│   │   │   │   ├── SKILL.md
│   │   │   │   └── stack-dashboard-zh.html
│   │   │   ├── digital-eguide
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── case（无限画布：作品集）
│   │   │   │   └── social-carousel.html
│   │   │   ├── dot-matrix-xhs
│   │   │   │   ├── SKILL.md
│   │   │   │   └── 点阵.html
│   │   │   ├── html-ppt-xhs-post
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── xhs-cover-spring.html
│   │   │   │   └── xhs-cover-typography.html
│   │   │   ├── industrial-archive
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── reference.html
│   │   │   │   ├── styles.md
│   │   │   │   └── template.html
│   │   │   ├── portfolio-detail
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── reference.html
│   │   │   │   └── template.html
│   │   │   ├── ppt
│   │   │   │   ├── AGENTS.md
│   │   │   │   ├── INDEX.md
│   │   │   │   ├── guizang-ppt
│   │   │   │   ├── html-ppt-zhangzara-8-bit-orbit
│   │   │   │   ├── html-ppt-zhangzara-biennale-yellow
│   │   │   │   ├── html-ppt-zhangzara-grove
│   │   │   │   ├── html-ppt-zhangzara-pin-and-paper
│   │   │   │   ├── html-ppt-zhangzara-retro-windows
│   │   │   │   ├── html-ppt-zhangzara-retro-zine
│   │   │   │   └── ib-pitch-book
│   │   │   ├── pricing-page
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pricing-cn.html
│   │   │   ├── project-brief
│   │   │   │   ├── SKILL.md
│   │   │   │   └── 清言周报-VOL18-notebook.html
│   │   │   ├── riso-product
│   │   │   │   ├── SKILL.md
│   │   │   │   └── reference.html
│   │   │   ├── saas-landing
│   │   │   │   ├── SKILL.md
│   │   │   │   └── reference.html
│   │   │   ├── social-card-data-kpi
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pattern.html
│   │   │   ├── social-card-editorial
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── assets
│   │   │   │   ├── pattern.html
│   │   │   │   └── references
│   │   │   ├── social-card-image-led
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pattern.html
│   │   │   ├── social-card-map
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pattern.html
│   │   │   ├── social-card-quote
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pattern.html
│   │   │   ├── social-card-screenshot-explainer
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pattern.html
│   │   │   ├── social-card-swiss
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── assets
│   │   │   │   ├── pattern.html
│   │   │   │   └── references
│   │   │   ├── social-carousel
│   │   │   │   ├── SKILL.md
│   │   │   │   └── scroll-gallery.html
│   │   │   ├── team-okrs
│   │   │   │   ├── SKILL.md
│   │   │   │   └── activity-stream.html
│   │   │   ├── video-shortform
│   │   │   │   ├── SKILL.md
│   │   │   │   └── video-shortform.html
│   │   │   ├── vr-canvas
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── images
│   │   │   │   ├── reference.html
│   │   │   │   └── template.html
│   │   │   ├── waitlist-page
│   │   │   │   ├── SKILL.md
│   │   │   │   └── 层云-waitlist.html
│   │   │   ├── wechat-cover-pair
│   │   │   │   ├── SKILL.md
│   │   │   │   └── pattern.html
│   │   │   ├── wireframe-sketch
│   │   │   │   ├── SKILL.md
│   │   │   │   └── foolscap-wireframe.html
│   │   │   └── xianying-tool
│   │   │       ├── SKILL.md
│   │   │       └── index.standalone.html
│   │   ├── export.md
│   │   ├── horizontal-craft
│   │   │   ├── README.md
│   │   │   ├── accessibility.md
│   │   │   ├── animation-discipline.md
│   │   │   ├── anti-ai-slop.md
│   │   │   ├── chinese-typography.md
│   │   │   ├── color.md
│   │   │   ├── data-integrity.md
│   │   │   ├── form-validation.md
│   │   │   ├── icon-system.md
│   │   │   ├── laws-of-ux.md
│   │   │   ├── link-and-proof.md
│   │   │   ├── reference
│   │   │   │   ├── directions.md
│   │   │   │   ├── fonts.md
│   │   │   │   ├── grid-system.md
│   │   │   │   ├── punctuation.md
│   │   │   │   ├── text-detail.md
│   │   │   │   └── title-and-breaking.md
│   │   │   ├── state-coverage.md
│   │   │   ├── technique-library.md
│   │   │   └── visual-explanation.md
│   │   ├── info-interactive.md
│   │   ├── landing-page.md
│   │   ├── portfolio.md
│   │   ├── prototype.md
│   │   ├── quality-gate.md
│   │   ├── social-card.md
│   │   └── web-tool.md
│   ├── docx
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── chart-templates.md
│   │   │   ├── common-rules.md
│   │   │   ├── decorations.md
│   │   │   ├── design-system.md
│   │   │   ├── docx-js-advanced.md
│   │   │   ├── docx-js-core.md
│   │   │   ├── faq.md
│   │   │   ├── math-formulas.md
│   │   │   ├── ooxml.md
│   │   │   └── toc.md
│   │   ├── routes
│   │   │   ├── comment.md
│   │   │   ├── create.md
│   │   │   ├── edit.md
│   │   │   ├── format.md
│   │   │   └── read.md
│   │   ├── scenes
│   │   │   ├── academic.md
│   │   │   ├── contract.md
│   │   │   ├── copywriting.md
│   │   │   ├── exam.md
│   │   │   ├── official-doc.md
│   │   │   ├── report.md
│   │   │   └── resume.md
│   │   ├── scripts
│   │   │   ├── __init__.py
│   │   │   ├── add_toc_placeholders.py
│   │   │   ├── document.py
│   │   │   ├── postcheck.py
│   │   │   ├── templates
│   │   │   │   ├── comments.xml
│   │   │   │   ├── commentsExtended.xml
│   │   │   │   ├── commentsExtensible.xml
│   │   │   │   ├── commentsIds.xml
│   │   │   │   └── people.xml
│   │   │   └── utilities.py
│   │   └── setup.sh
│   ├── dream-interpreter
│   │   ├── SKILL.md
│   │   ├── assets
│   │   │   └── example_asset.txt
│   │   ├── references
│   │   │   ├── api_reference.md
│   │   │   ├── interpretation-guide.md
│   │   │   ├── output-schema.md
│   │   │   ├── questioning-strategy.md
│   │   │   └── visual-mapping.md
│   │   ├── scripts
│   │   │   └── example.py
│   │   └── skill.json
│   ├── finance
│   │   ├── Finance_API_Doc.md
│   │   └── SKILL.md
│   ├── fullstack-dev
│   │   └── SKILL.md
│   ├── gaokao-collect-student-info
│   │   ├── SKILL.md
│   │   ├── examples
│   │   │   ├── student_shandong.json
│   │   │   └── student_template.json
│   │   └── reference.md
│   ├── gaokao-fetch-volunteers
│   │   ├── SKILL.md
│   │   ├── examples
│   │   │   ├── api_request_shandong.json
│   │   │   └── api_request_template.json
│   │   ├── preference_mapping.md
│   │   ├── reference.md
│   │   ├── requirements.txt
│   │   └── scripts
│   │       ├── build_api_request.py
│   │       ├── fetch_volunteers.py
│   │       ├── province_config.py
│   │       └── test_batch_api.py
│   ├── gaokao-generate-report
│   │   ├── SKILL.md
│   │   ├── examples
│   │   │   └── analysis_merged_example.json
│   │   ├── requirements.txt
│   │   ├── scripts
│   │   │   ├── generate_html.py
│   │   │   └── merge_analysis.py
│   │   └── templates
│   │       └── volunteer_report.html
│   ├── gaokao-recommend-majors
│   │   ├── SKILL.md
│   │   ├── career_reference.md
│   │   └── examples
│   │       └── major_recommendation_template.json
│   ├── gaokao-recommend-schools
│   │   ├── SKILL.md
│   │   ├── career_reference.md
│   │   └── examples
│   │       └── school_recommendation_template.json
│   ├── get-fortune-analysis
│   │   ├── SKILL.md
│   │   └── lunar_python.py
│   ├── gift-evaluator
│   │   ├── SKILL.md
│   │   └── html_tools.py
│   ├── image-edit
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── image-edit.ts
│   ├── image-generation
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── image-generation.ts
│   ├── image-search
│   │   └── SKILL.md
│   ├── image-understand
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── image-understand.ts
│   ├── interview-designer
│   │   ├── README.md
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── references
│   │   │   └── design_rationale.md
│   │   └── templates
│   │       └── interview_guide_template.md
│   ├── interview-prep
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── answer_frameworks.md
│   │   │   ├── behavioral.md
│   │   │   ├── case.md
│   │   │   ├── hr_round.md
│   │   │   ├── role_finance.md
│   │   │   ├── role_internet.md
│   │   │   ├── role_tech.md
│   │   │   ├── salary_negotiation.md
│   │   │   └── technical.md
│   │   └── scripts
│   │       └── star_story_builder.py
│   ├── jd-resume-tailor
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── jd_parsing_signals.md
│   │   │   └── rewrite_principles.md
│   │   └── scripts
│   │       ├── jd_gap.py
│   │       └── parse_jd.py
│   ├── job-intent-tracker
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── keywords_finance.md
│   │   │   ├── keywords_general.md
│   │   │   ├── keywords_internet.md
│   │   │   ├── keywords_tech.md
│   │   │   └── target_profile_template.md
│   │   └── scripts
│   │       ├── init_tracker.py
│   │       └── profile_match.py
│   ├── market-research-reports
│   │   ├── SKILL.md
│   │   ├── assets
│   │   │   ├── FORMATTING_GUIDE.md
│   │   │   ├── market_report_template.tex
│   │   │   └── market_research.sty
│   │   ├── references
│   │   │   ├── data_analysis_patterns.md
│   │   │   ├── report_structure_guide.md
│   │   │   └── visual_generation_guide.md
│   │   └── scripts
│   │       └── generate_market_visuals.py
│   ├── marketing-mode
│   │   ├── README.md
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── mode-prompt.md
│   │   └── skill.json
│   ├── mindfulness-meditation
│   │   ├── SKILL.md
│   │   └── _meta.json
│   ├── multi-search-engine
│   │   ├── CHANGELOG.md
│   │   ├── CHANNELLOG.md
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── config.json
│   │   ├── metadata.json
│   │   └── references
│   │       └── international-search.md
│   ├── pdf
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   ├── briefs
│   │   │   ├── academic.md
│   │   │   ├── creative-fixed-canvas.md
│   │   │   ├── creative-flow.md
│   │   │   ├── creative.md
│   │   │   ├── poster.md
│   │   │   ├── process.md
│   │   │   ├── report.md
│   │   │   └── resume.md
│   │   ├── configs
│   │   │   ├── components.md
│   │   │   ├── fonts.md
│   │   │   └── visual_framework.md
│   │   ├── env_setup
│   │   │   ├── env_check.sh
│   │   │   ├── font_list.txt
│   │   │   ├── setup.md
│   │   │   ├── setup_mac_linux.sh
│   │   │   └── setup_windows.ps1
│   │   ├── references
│   │   │   ├── resume-academic.tex
│   │   │   └── resume-altacv.tex
│   │   ├── scripts
│   │   │   ├── cover_validate.js
│   │   │   ├── design_engine.py
│   │   │   ├── html2pdf-next.js
│   │   │   ├── html2poster.js
│   │   │   ├── pdf.py
│   │   │   ├── pdf_qa.py
│   │   │   ├── poster_validate.py
│   │   │   ├── setup.sh
│   │   │   └── toc_validate.py
│   │   └── typesetting
│   │       ├── charts.md
│   │       ├── cover-backgrounds.md
│   │       ├── cover.md
│   │       ├── fill-engine.md
│   │       ├── geometry.md
│   │       ├── overflow.md
│   │       ├── pagination.md
│   │       ├── palette.md
│   │       └── typography.md
│   ├── podcast-generate
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   ├── generate.ts
│   │   ├── package.json
│   │   ├── readme.md
│   │   ├── test_data
│   │   │   └── segments.jsonl
│   │   └── tsconfig.json
│   ├── pptx
│   │   ├── SKILL.md
│   │   ├── batch_html2pptx.js
│   │   ├── html2pptx1.js
│   │   ├── ooxml
│   │   │   └── scripts
│   │   │       ├── pack.py
│   │   │       ├── unpack.py
│   │   │       ├── validate.py
│   │   │       └── validation
│   │   └── scripts
│   │       ├── check_slides.py
│   │       ├── extract_html_style.py
│   │       └── extract_pptx_style.py
│   ├── qingyan-research
│   │   ├── SKILL.md
│   │   └── generate_html.py
│   ├── quiz-html
│   │   ├── README.md
│   │   ├── SKILL.md
│   │   ├── examples
│   │   │   └── demo.html
│   │   ├── scripts
│   │   │   └── build_quiz_html.py
│   │   ├── skill.yaml
│   │   └── templates
│   │       └── quiz_template.html
│   ├── quiz-mastery
│   │   ├── .claude
│   │   ├── README.md
│   │   ├── SKILL.md
│   │   ├── data
│   │   ├── scripts
│   │   │   ├── generate_from_material.py
│   │   │   ├── import_quiz.py
│   │   │   ├── run_quiz.py
│   │   │   └── submit_answers.py
│   │   ├── skill.yaml
│   │   └── src
│   │       └── quiz_mastery
│   │           ├── __init__.py
│   │           ├── evaluator.py
│   │           ├── file_parser.py
│   │           ├── mastery_engine.py
│   │           ├── models.py
│   │           ├── planner.py
│   │           ├── quiz_extractor.py
│   │           ├── quiz_generator.py
│   │           ├── repository.py
│   │           ├── service.py
│   │           └── utils.py
│   ├── resume-builder
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── export_guide.md
│   │   │   ├── intake_questions.md
│   │   │   ├── keywords
│   │   │   │   ├── finance.txt
│   │   │   │   ├── general.txt
│   │   │   │   ├── internet.txt
│   │   │   │   └── tech.txt
│   │   │   ├── star_rewrite_guide.md
│   │   │   └── templates
│   │   │       ├── finance.md
│   │   │       ├── general.md
│   │   │       ├── internet.md
│   │   │       └── tech.md
│   │   └── scripts
│   │       └── ats_check.py
│   ├── seo-content-writer
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   └── references
│   │       ├── content-structure-templates.md
│   │       └── title-formulas.md
│   ├── skill-creator
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   ├── agents
│   │   │   ├── analyzer.md
│   │   │   ├── comparator.md
│   │   │   └── grader.md
│   │   ├── assets
│   │   │   └── eval_review.html
│   │   ├── eval-viewer
│   │   │   ├── generate_review.py
│   │   │   └── viewer.html
│   │   ├── references
│   │   │   └── schemas.md
│   │   └── scripts
│   │       ├── __init__.py
│   │       ├── aggregate_benchmark.py
│   │       ├── generate_report.py
│   │       ├── improve_description.py
│   │       ├── package_skill.py
│   │       ├── quick_validate.py
│   │       ├── run_eval.py
│   │       ├── run_loop.py
│   │       └── utils.py
│   ├── skill-finder-cn
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── package.json
│   │   └── scripts
│   │       └── search.sh
│   ├── stock-analysis-skill
│   │   ├── SKILL.md
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── analyzer.ts
│   │   │   ├── dataFetcher.ts
│   │   │   ├── dividend.ts
│   │   │   ├── index.ts
│   │   │   ├── rumorScanner.ts
│   │   │   ├── types.ts
│   │   │   └── watchlist.ts
│   │   └── tsconfig.json
│   ├── storyboard-manager
│   │   ├── SKILL.md
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── references
│   │   │   ├── character_development.md
│   │   │   └── story_structures.md
│   │   └── scripts
│   │       ├── consistency_checker.py
│   │       └── timeline_tracker.py
│   ├── study-buddy
│   │   └── SKILL.md
│   ├── task-review
│   │   └── SKILL.md
│   ├── ui-ux-pro-max
│   │   ├── SKILL.md
│   │   ├── _meta.json
│   │   ├── assets
│   │   │   └── data
│   │   │       ├── charts.csv
│   │   │       ├── colors.csv
│   │   │       ├── icons.csv
│   │   │       ├── landing.csv
│   │   │       ├── products.csv
│   │   │       ├── react-performance.csv
│   │   │       ├── stacks
│   │   │       ├── styles.csv
│   │   │       ├── typography.csv
│   │   │       ├── ui-reasoning.csv
│   │   │       ├── ux-guidelines.csv
│   │   │       └── web-interface.csv
│   │   ├── data
│   │   │   ├── charts.csv
│   │   │   ├── colors.csv
│   │   │   ├── icons.csv
│   │   │   ├── landing.csv
│   │   │   ├── products.csv
│   │   │   ├── react-performance.csv
│   │   │   ├── stacks
│   │   │   │   ├── astro.csv
│   │   │   │   ├── flutter.csv
│   │   │   │   ├── html-tailwind.csv
│   │   │   │   ├── jetpack-compose.csv
│   │   │   │   ├── nextjs.csv
│   │   │   │   ├── nuxt-ui.csv
│   │   │   │   ├── nuxtjs.csv
│   │   │   │   ├── react-native.csv
│   │   │   │   ├── react.csv
│   │   │   │   ├── shadcn.csv
│   │   │   │   ├── svelte.csv
│   │   │   │   ├── swiftui.csv
│   │   │   │   └── vue.csv
│   │   │   ├── styles.csv
│   │   │   ├── typography.csv
│   │   │   ├── ui-reasoning.csv
│   │   │   ├── ux-guidelines.csv
│   │   │   └── web-interface.csv
│   │   ├── references
│   │   │   ├── upstream-README.md
│   │   │   └── upstream-skill-content.md
│   │   └── scripts
│   │       ├── __init__.py
│   │       ├── core.py
│   │       ├── design_system.py
│   │       └── search.py
│   ├── version-management
│   │   └── SKILL.md
│   ├── video-generation
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── video.ts
│   ├── video-understand
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── video-understand.ts
│   ├── visual-design-foundations
│   │   ├── SKILL.md
│   │   └── references
│   │       ├── color-systems.md
│   │       ├── spacing-iconography.md
│   │       └── typography-systems.md
│   ├── web-reader
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── web-reader.ts
│   ├── web-search
│   │   ├── LICENSE.txt
│   │   ├── SKILL.md
│   │   └── scripts
│   │       └── web_search.ts
│   ├── web-shader-extractor
│   │   ├── SKILL.md
│   │   ├── references
│   │   │   ├── config-extraction.md
│   │   │   ├── encoded-definitions.md
│   │   │   ├── extraction-workflow.md
│   │   │   ├── porting-strategy.md
│   │   │   ├── shader-injection.md
│   │   │   ├── shaders-com.md
│   │   │   ├── tech-signatures.md
│   │   │   ├── tsl-extraction.md
│   │   │   └── unicorn-studio.md
│   │   └── scripts
│   │       ├── fetch-rendered-dom.mjs
│   │       └── scan-bundle.sh
│   ├── writing-plans
│   │   ├── SKILL.md
│   │   └── _meta.json
│   └── xlsx
│       ├── LICENSE.txt
│       ├── SKILL.md
│       ├── engines
│       │   ├── chart-templates.md
│       │   ├── chart.md
│       │   ├── design.md
│       │   └── vba-templates.md
│       ├── quality
│       │   └── pipeline.md
│       ├── scenes
│       │   ├── advanced.md
│       │   ├── analyze-recipes.md
│       │   ├── analyze.md
│       │   ├── convert.md
│       │   ├── create.md
│       │   ├── edit-patterns.md
│       │   ├── edit.md
│       │   ├── finance.md
│       │   ├── finance_lite.md
│       │   └── vba.md
│       ├── setup.sh
│       ├── templates
│       │   ├── base.py
│       │   └── palettes.py
│       └── xlsx.py
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── route.ts
│   │   │   └── v1
│   │   │       ├── api-keys
│   │   │       ├── auth
│   │   │       ├── health
│   │   │       ├── organizations
│   │   │       └── users
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   └── ui
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── alert.tsx
│   │       ├── aspect-ratio.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── breadcrumb.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── carousel.tsx
│   │       ├── chart.tsx
│   │       ├── checkbox.tsx
│   │       ├── collapsible.tsx
│   │       ├── command.tsx
│   │       ├── context-menu.tsx
│   │       ├── dialog.tsx
│   │       ├── drawer.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── hover-card.tsx
│   │       ├── input-otp.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── menubar.tsx
│   │       ├── navigation-menu.tsx
│   │       ├── pagination.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── radio-group.tsx
│   │       ├── resizable.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── sonner.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toast.tsx
│   │       ├── toaster.tsx
│   │       ├── toggle-group.tsx
│   │       ├── toggle.tsx
│   │       └── tooltip.tsx
│   ├── hooks
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   └── lib
│       ├── api.ts
│       ├── audit.ts
│       ├── auth.ts
│       ├── bullmq.ts
│       ├── config.ts
│       ├── db.ts
│       ├── feature-flags.ts
│       ├── i18n.ts
│       ├── middleware.ts
│       ├── qdrant.ts
│       ├── rate-limit.ts
│       ├── redis.ts
│       ├── storage.ts
│       ├── store.ts
│       ├── utils.ts
│       └── validators.ts
├── tailwind.config.ts
├── tsconfig.json
├── upload
└── worklog.md

```
