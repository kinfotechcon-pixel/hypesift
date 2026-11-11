/* Hypesift case-file packs. To add a weekly pack: add a new PACK_W array, add it to PACKS, add any new pattern to TIPS,
   then run: node scripts/validate-packs.js */
(function () {
  var CHECKED = "Nov 11, 2026";

  /* To add a weekly pack: append one object to PACKS with the same shape (id, label, checked, cases). Older packs stay playable. */
  var PACK_W46 = [
    {
      id: "fable-security", title: "Fable security score", date: "Nov 10, 2026", src: "Palo Alto Networks", primary: true,
      url: "https://www.paloaltonetworks.com/blog/security-operations/claude-fable-5-2-hits-a-perfect-score-on-our-security-benchmark-the-first-model-ever-to-do-it/",
      claim: "Claude Fable 5.2 got a perfect security score. AI agents are now secure.",
      verdict: "overstated",
      why: "Real result, but the authors say it secures the model, not the whole system.",
      opts: ["Too few tests to count", "It tests the model only, not the whole system", "A perfect score means a broken test"], right: 1,
      facts: [
        "Palo Alto's Cortex AES team published it on Nov 10, 2026.",
        "Their Model Security Compass puts each model in simulated agent setups (inbox, browser, file store, code project with a shell) and tries hijacking, rule override, credential leaks and fake packages.",
        "Reported outcome: 0% attack success across thousands of tests, the first perfect 100 on this benchmark.",
        "The authors write that the model is one control, not the only one."
      ],
      pattern: "Model is not the system"
    },
    {
      id: "gemini-price", title: "Gemini 4 Carbon price", date: "Nov 10, 2026", src: "Google blog", primary: true,
      url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-carbon-now-available/",
      claim: "Gemini 4 Carbon costs just $2 per million input tokens.",
      verdict: "context",
      why: "That's a launch price. It doubles to $4 after Nov 30, 2026.",
      opts: ["The price is a launch offer that doubles Nov 30", "Input tokens cost less than output", "Argon had the same launch price"], right: 0,
      facts: [
        "Google made Gemini 4 Carbon available on Nov 10, 2026.",
        "Introductory pricing: $2 per million input tokens and $10 per million output tokens.",
        "After Nov 30, 2026 the public model is listed at $4 input and $20 output per million tokens."
      ],
      pattern: "Introductory pricing"
    },
    {
      id: "legal-aid", title: "Legal-aid benchmark", date: "Nov 10, 2026", src: "Unite.AI", primary: false,
      url: "https://www.unite.ai/vals-ai-legal-aid-benchmark-finds-models-fall-short-on-local-help/",
      claim: "AI explains the law well but is weak at pointing people to local legal help.",
      verdict: "solid",
      why: "Matches the report: 78 to 87% on general answers, 30 to 50% on local resources.",
      opts: ["A famous model came first", "It was tested in consumer chat apps", "It gives counts and a pass bar (23 models, 252 scenarios)"], right: 2,
      facts: [
        "NextLadder Ventures and Vals AI announced the Access to Justice Benchmark on Nov 10, 2026.",
        "None of 23 models reached the 80% bar for a reliable first point of contact across 252 scenarios.",
        "Models met 78 to 87% of expert criteria on general explanations, but 30 to 50% on identifying local programs, court help centers or forms.",
        "Caveat from the report: the top three models are within each other's margin of error, and API tests can't fully capture consumer chatbot behavior."
      ],
      pattern: "Specific, sourced numbers"
    },
    {
      id: "mistral-chart", title: "Mistral coding chart", date: "Oct 6, 2026", src: "VentureBeat", primary: false,
      url: "https://venturebeat.com/technology/mistral-debuts-large-4-le-chonk-a-1-trillion-parameter-text-output-model-with-high-benchmarks-planned-for-open-weights-release",
      claim: "Mistral Large 4 posts top-tier coding scores.",
      verdict: "overstated",
      why: "On the live leaderboard, several models beat Mistral's reported 62%.",
      opts: ["Model size: a trillion parameters wins", "A live leaderboard shows others scoring higher", "Open weights prove the numbers"], right: 1,
      facts: [
        "Mistral reported about 62% on the DeepSWE v1.1 coding benchmark at launch (Oct 6, 2026).",
        "VentureBeat checked the chart against the live DeepSWE leaderboard: GLM-5.3 and Kimi K3 near 69%, and GPT-6 Astra, Gemini 3.8 Flash and Claude Opus 5 near 74%.",
        "Mistral planned a public preview first, with weights to follow after roughly three weeks of testing."
      ],
      pattern: "Leaderboard gap"
    },
    {
      id: "kalshi-ipo", title: "Anthropic IPO odds", date: "Nov 6, 2026", src: "CNBC", primary: false,
      url: "https://www.cnbc.com/2026/11/06/anthropic-ipo-kalshi-post-midterms-ai-sell-off.html",
      claim: "Traders now give Anthropic a 57% chance of announcing an IPO before December.",
      verdict: "solid",
      why: "CNBC reports it exactly. It's a market bet that fell from nearly 90% in a week.",
      opts: ["It's Anthropic's own forecast", "Under 60% means the IPO is off", "It's a trader probability that moved fast"], right: 2,
      facts: [
        "CNBC published the report on Nov 6, 2026.",
        "Odds of an announcement before December fell to 57% from nearly 90% over the past week; odds before January fell to 68%.",
        "CNBC says the contract asks when Anthropic will officially announce an IPO, and that Anthropic confidentially filed its prospectus in June."
      ],
      pattern: "Probability, not fact"
    },
    {
      id: "lg-exaone", title: "LG's 70% claim", date: "Nov 9, 2026", src: "The Korea Times", primary: false,
      url: "https://www.koreatimes.co.kr/business/companies/20261109/lg-ai-research-opens-k-exaone-25-api-free-of-charge",
      claim: "LG's new K-EXAONE 2.5 is over 70% better.",
      verdict: "context",
      why: "The gain is LG's own comparison against its earlier version.",
      opts: ["LG measured against its own earlier version", "Free APIs mean low quality", "24 benchmarks is too few"], right: 0,
      facts: [
        "LG AI Research opened the K-EXAONE 2.5 API free of charge on Nov 9, 2026.",
        "The 70% figure is a gain over its earlier version across 24 benchmarks, from an internal analysis by the head of LG's EXAONE Lab.",
        "No independent test is cited in the report."
      ],
      pattern: "Self-measured comparison"
    },
    {
      id: "ingenix", title: "Ingenix benchmark", date: "Nov 9, 2026", src: "Ingenix press release", primary: false,
      url: "https://www.wfxrtv.com/business/press-releases/cision/20261109LN91312/polish-ai-start-up-claims-first-place-on-longevitybench-and-open-sources-a-version-of-its-thalamus-reasoning-model",
      claim: "A small open-source model just beat 28 rivals, including the big labs.",
      verdict: "overstated",
      why: "The model that ranked first isn't the one being released, and it's one niche benchmark.",
      opts: ["9B parameters can't rank first", "Press releases are never accurate", "The ranked model isn't the one being released"], right: 2,
      facts: [
        "Ingenix (Warsaw) announced the result on Nov 9, 2026.",
        "Its 9-billion-parameter Thalamus Reasoning ranks first out of 29 models on LongevityBench, a benchmark for language models in cellular aging research.",
        "Ingenix says it will open-source a version called Thalamus Decision and is developing a 95-billion-parameter model.",
        "The ranking comes from the company's own announcement; the release cites no outside replication."
      ],
      pattern: "Name switch"
    },
    {
      id: "gpt6-cyber", title: "GPT-6 Cyber score", date: "Nov 5, 2026", src: "OpenAI", primary: true,
      url: "https://openai.com/index/introducing-gpt-6-cyber/",
      claim: "OpenAI says GPT-6 Cyber scored 48.5% on ExploitGym, up 51%, with limited access.",
      verdict: "solid",
      why: "Attributed, specific, and the math holds: 48.5 vs 32.1 is about 51% higher.",
      opts: ["It uses a big percentage", "It names who measured, the benchmark and the access limit", "It names a new model"], right: 1,
      facts: [
        "OpenAI released GPT-6 Cyber on Nov 5, 2026 for finding exploitable vulnerabilities and developing fixes within authorized scope.",
        "ExploitGym: 48.5% versus 32.1% for GPT-5.6 Cyber.",
        "Access starts with a select group of approved Daybreak Red customers through the API and Codex.",
        "OpenAI classifies it as Critical in cybersecurity under its Preparedness Framework and lists external partners that ran tests."
      ],
      pattern: "Attributed number"
    }
  ];

  var PACK_W3 = [
    {
      id: "anthropic-ipo-value", title: "Anthropic's $1.4T", date: "Nov 10, 2026", src: "Reuters", primary: false,
      url: "https://www.reuters.com/business/anthropic-ipo-raise-much-644-billion-latest-draft-prospectus-shows-2026-11-10/",
      claim: "Anthropic is now worth $1.4 trillion.",
      verdict: "overstated",
      why: "That's the top of a draft IPO price range, not a final price or a market value.",
      opts: ["Reuters made the number up", "It's the valuation at the top of a draft price range", "A trillion is too big to be real"], right: 1,
      facts: [
        "Reuters reported on Nov 10, 2026 from Anthropic's latest draft prospectus.",
        "The draft lists a price range of $70 to $78 a share and about 825 million shares, raising up to $64.4 billion.",
        "The $1.4 trillion figure is the fully diluted valuation at the top of that range. It is not final."
      ],
      pattern: "Range, not price"
    },
    {
      id: "softbank-loss", title: "SoftBank's $7B loss", date: "Nov 10, 2026", src: "CNBC", primary: false,
      url: "https://www.cnbc.com/2026/11/10/softbank-2q-earnings-tech-selloff.html",
      claim: "SoftBank swung to a $7 billion loss, including a $3.7 billion writedown on US data centers.",
      verdict: "solid",
      why: "CNBC reports both numbers, and it splits one named cause out of the total.",
      opts: ["It blames AI for the whole loss", "It's a forecast for next year", "It splits one named cause out of the total"], right: 2,
      facts: [
        "SoftBank reported a fiscal second-quarter net loss of 1.12 trillion yen, about $7 billion (CNBC, Nov 10, 2026).",
        "$3.7 billion (597.2 billion yen) came from changes in plans to buy power-generation equipment for US AI data center projects.",
        "Falling Intel shares also weighed on the result, and the Vision Fund segment swung to a loss."
      ],
      pattern: "Named breakdown"
    },
    {
      id: "hbr-seismic", title: "The 11% revenue stat", date: "Nov 4, 2026", src: "CustomerThink", primary: false,
      url: "https://customerthink.com/new-study-finds-ai-adoption-surging-across-go-to-market-teams-but-revenue-gains-lag-behind/",
      claim: "Just 11% of companies see revenue gains from AI.",
      verdict: "context",
      why: "It's 208 people in B2B revenue roles, in a study sponsored by Seismic.",
      opts: ["11% is too low to be real", "It's 208 people in B2B revenue roles, in a sponsored study", "HBR never publishes surveys"], right: 1,
      facts: [
        "Harvard Business Review Analytic Services ran the study, sponsored by Seismic; it was announced Nov 4, 2026.",
        "208 members of the HBR audience answered, mostly senior or executive roles at B2B companies, fielded in June 2026.",
        "75% said their organization increased AI use in revenue activities; 11% reported more revenue or new revenue streams from AI.",
        "Only 18% use AI agents to assist revenue staff in real time."
      ],
      pattern: "Small, sponsored sample"
    },
    {
      id: "ripple-65b", title: "Ripple's coding lead", date: "Nov 4, 2026", src: "VentureBeat", primary: false,
      url: "https://venturebeat.com/technology/ex-googlers-new-apache-2-0-model-ripple-65b-preview-claims-the-u-s-open-coding-lead-on-two-major-benchmarks",
      claim: "A new open model leads every US open model in coding.",
      verdict: "overstated",
      why: "The lead covers two benchmarks and four chosen rivals, and the company's other results are weaker.",
      opts: ["The model has an Apache 2.0 license", "The lead covers two benchmarks and a chosen set of rivals", "65B parameters is too small to lead"], right: 1,
      facts: [
        "Ricursive Intelligence released Ripple-65B Preview under Apache 2.0 on Nov 4, 2026.",
        "It claims the lead on Terminal-Bench 2.1 and SWE-bench Pro v2.0 Hard against Nvidia Nemotron 3 Ultra, Thinking Machines Inkling, Meta Muse Spark Open and Reflection Beam.",
        "The scores are company-reported. VentureBeat notes the lead applies to selected US rivals and tests, and the company's own results trail other open models on additional benchmarks."
      ],
      pattern: "Cherry-picked comparison"
    },
    {
      id: "okta-identity", title: "Okta's AI survey", date: "Nov 4, 2026", src: "PPC Land", primary: false,
      url: "https://ppc.land/80-of-firms-are-slower-than-planned-on-ai-features-okta-survey-finds/",
      claim: "Companies using an external identity platform are ahead on AI.",
      verdict: "overstated",
      why: "It's a self-reported correlation from a survey Okta commissioned, and Okta sells that kind of platform.",
      opts: ["34% versus 22% is too close to matter", "The sponsor sells it, and the survey is self-reported correlation", "Developers can't judge AI progress"], right: 1,
      facts: [
        "Okta commissioned two surveys: 5,250 consumers (run by Statista) and 910 developers and senior leaders (fielded by Rep Data in July and August 2026). PPC Land published the analysis on Nov 4.",
        "34.4% of organizations using only an external customer identity platform have AI or agentic features fully in production, versus 22.3% elsewhere.",
        "The comparison is self-reported and doesn't control for company size, budget or industry. Okta sells an external customer identity platform."
      ],
      pattern: "Sponsor's product"
    },
    {
      id: "fable-pricing", title: "Fable 5.2 pricing", date: "Nov 9, 2026", src: "Resultsense", primary: false,
      url: "https://www.resultsense.com/news/2026-11-10-claude-fable-mythos-5-2-launch/",
      claim: "Anthropic priced Fable 5.2 at $8 per million input tokens and $40 per million output.",
      verdict: "solid",
      why: "It's a posted price anyone can check, not a performance claim.",
      opts: ["Prices are always marketing", "It states a posted price anyone can check", "It leaves out the model's name"], right: 1,
      facts: [
        "Anthropic launched Fable 5.2 and Mythos 5.2 on Nov 9, 2026, at $8 per million tokens in and $40 out, with an optional fast mode at $16 and $80.",
        "Anthropic says output is up to 30% faster than the 5.1 versions. That speed figure is its own claim.",
        "The $8 and $40 figures are also reported by other outlets covering the launch.",
        "In Anthropic's own benchmark table, Fable 5.2 scores 69.9% on FrontierSWE v2 versus 65.5% for GPT-6 Astra. Outside evaluators named: METR, Frontier Design and the UK AI Security Institute."
      ],
      pattern: "Checkable fact"
    },
    {
      id: "scientists-claude", title: "How scientists use Claude", date: "Nov 5, 2026", src: "Anthropic research", primary: true,
      url: "https://www.anthropic.com/research/how-researchers-use-claude",
      claim: "Data analysis is the top research use of Claude, at about a third of sessions.",
      verdict: "solid",
      why: "Anthropic's study reports 33.7% of Claude sessions, with its sample and limits stated.",
      opts: ["It comes from a poll of scientists", "Anthropic can't measure its own usage", "It states a sample size and its limits"], right: 2,
      facts: [
        "Anthropic analyzed 207,049 research sessions from Aug 2 to Sep 30, 2026 (128,914 on Claude, 78,135 on Claude Code), published Nov 5.",
        "A classifier labeled each session by field and task, and results are reported only in aggregate.",
        "Data analysis was 33.7% of Claude sessions and 48.1% of Claude Code sessions; writing was 32.0% of Claude sessions.",
        "Stated limits: survey respondents are likely heavier AI users than typical scientists, and small subfields are estimated less precisely."
      ],
      pattern: "Method disclosed"
    },
    {
      id: "tether-botpsy", title: "Tether's tiny model", date: "Nov 11, 2026", src: "Bloomingbit", primary: false,
      url: "https://en.bloomingbit.io/feed/news/124202",
      claim: "Tether's tiny on-device AI beats bigger models.",
      verdict: "context",
      why: "It beat a model about 2.5x its size in Tether's own tests, not the wider field.",
      opts: ["On-device models can't be good", "Tether's own tests, against a model only 2.5x bigger", "A stablecoin issuer can't build AI"], right: 1,
      facts: [
        "Tether released QVAC BotPsy on Nov 11, 2026 (Bloomingbit report): 800 million parameters, built on Alibaba's Qwen3.5 architecture.",
        "Tether says it beats Qwen3.5-2B-Think, which has 2.5 times more parameters, and its own base model, on tool-use benchmarks including BFCL v4 and ACEBench.",
        "The results come from Tether's internal testing; the report notes independent verification is still needed."
      ],
      pattern: "Self-measured comparison"
    }
  ];

  var PACKS = [
    { id: "2026-11-w2", label: "Week 1", checked: CHECKED, cases: PACK_W46 },
    { id: "2026-11-w3", label: "Week 2", checked: CHECKED, cases: PACK_W3 }
  ];

  var TIPS = {
    "Model is not the system": "A score for the model says little about the product built around it.",
    "Introductory pricing": "Check whether a price is a launch offer, and when it changes.",
    "Specific, sourced numbers": "Counts, thresholds and stated caveats make a claim testable.",
    "Leaderboard gap": "Put a vendor's chart next to an independent leaderboard.",
    "Probability, not fact": "A market figure is a bet about the future, not an announcement.",
    "Self-measured comparison": "Ask: better than what, and who measured it?",
    "Name switch": "Check that the model tested is the model that ships.",
    "Attributed number": "A solid claim says who measured what, on which benchmark, with what limits.",
    "Range, not price": "A valuation at the top of a draft range is a target, not a trade.",
    "Named breakdown": "Trustworthy numbers say which part of the total came from what.",
    "Small, sponsored sample": "Check how many people answered, who they are, and who paid.",
    "Cherry-picked comparison": "A lead over chosen rivals on chosen tests is not a lead over everyone.",
    "Sponsor's product": "Ask whether the study's conclusion happens to sell the sponsor's product.",
    "Checkable fact": "A posted price or date can be verified; a performance claim needs a method.",
    "Method disclosed": "Sample size, time frame and stated limits make a finding testable."
  };

  window.HYPESIFT_DATA = { checked: CHECKED, packs: PACKS, tips: TIPS };
})();
