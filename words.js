/* AIVoCab word packs. To add a weekly pack: append one object to WORD_PACKS (id, label, blurb, track: "weekly", checked, words),
   with exactly 8 words in the same shape, then run: node scripts/validate-words.js
   Word shape: id, word, say (respelling), level ("Starter" | "Everyday" | "Insider"),
   defs (3 meanings) + d (index of the right one), uses (3 sentences) + u (index of the right one),
   plain (plain-English explanation), where (where you will see it), mixup (a common mix-up), src + url (a reliable definition). */
(function () {
  var CHECKED = "Nov 15, 2026";
  var GOOGLE = { src: "Google Machine Learning Glossary", url: "https://developers.google.com/machine-learning/glossary" };
  var CLAUDE = { src: "Claude Platform glossary", url: "https://platform.claude.com/docs/en/about-claude/glossary" };

  var BASICS = [
    {
      id: "model", word: "Model", say: "MOD-ul", level: "Starter",
      defs: [
        "A short sample answer a teacher gives to show how a task should be done",
        "A computer program that learned patterns from lots of examples and uses them to give answers or predictions",
        "A physical robot body that an AI program controls"
      ], d: 1,
      uses: [
        "I opened the model on my phone and typed in my question.",
        "The company released a new model that can write code and summarize documents.",
        "The model is the folder where all the training photos are stored."
      ], u: 1,
      plain: "In AI, a model is the thing that has learned from examples. You give it an input and it gives back an output: an answer, a picture or a prediction. Chatbots and apps are built around models.",
      where: "In almost every AI headline: \"a new model\", \"a better model\".",
      mixup: "The app you chat with is not the model. The model is the engine inside it.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "training", word: "Training", say: "TRAY-ning", level: "Starter",
      defs: [
        "A short course that teaches people how to use an AI tool",
        "Testing a finished model to see how smart it is",
        "Showing a model huge numbers of examples so it adjusts itself and gets better at a task"
      ], d: 2,
      uses: [
        "Our team finished training and now knows how to write better prompts.",
        "The model's training began when the first user typed a question.",
        "The model finished training after months of learning from billions of examples."
      ], u: 2,
      plain: "Training is how a model learns. It looks at a huge pile of examples and keeps adjusting its inner settings until its answers get good. It happens before you ever use the model.",
      where: "\"Trained on…\", \"training data\" and \"training run\" in model announcements.",
      mixup: "Training is learning. Using the finished model to answer you is called inference.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "prompt", word: "Prompt", say: "PROMPT", level: "Starter",
      defs: [
        "The text or instructions you give an AI so it knows what to do",
        "The AI's answer to your question",
        "A warning message the AI shows when it makes an error"
      ], d: 0,
      uses: [
        "The chatbot's prompt appeared on screen after it finished thinking.",
        "She wrote a prompt that fixed the model's training data.",
        "Adding an example to your prompt made the answer much clearer."
      ], u: 2,
      plain: "A prompt is what you say to the AI: a question, an instruction or a document to work with. Clearer prompts usually get better answers.",
      where: "Chatbots, image generators and every \"prompt tips\" article.",
      mixup: "The prompt is your input. What comes back is the output, or response.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "token", word: "Token", say: "TOH-kun", level: "Starter",
      defs: [
        "A digital coin you earn for using a chatbot",
        "A secret password that unlocks an AI service",
        "A small chunk of text, often a word or part of a word, that a model reads and counts"
      ], d: 2,
      uses: [
        "I earned 50 tokens for chatting, so I can spend them in the AI shop.",
        "The long report was too big: it used more than 100,000 tokens.",
        "Paste your token in the box to log in to the AI service."
      ], u: 1,
      plain: "Models don't read whole words the way we do. They split text into small pieces called tokens. Companies count tokens to measure how much text a model handles, and to set prices.",
      where: "Pricing pages (\"per million tokens\") and model specs.",
      mixup: "A login key is a password. A token, in this sense, is a piece of text.",
      src: CLAUDE.src, url: CLAUDE.url
    },
    {
      id: "hallucination", word: "Hallucination", say: "huh-LOO-sih-NAY-shun", level: "Starter",
      defs: [
        "When an AI image generator draws something dreamlike",
        "When an AI states something that sounds convincing but is false or made up",
        "When an AI freezes because too many people are using it"
      ], d: 1,
      uses: [
        "The AI hallucinated whenever a question was too hard and it politely refused to answer.",
        "The chatbot hallucinated a court case that never existed.",
        "The chatbot hallucinated because the website went offline."
      ], u: 1,
      plain: "A hallucination is a confident answer that isn't true: a made-up quote, a book that doesn't exist, a wrong date. The AI isn't lying on purpose. It produces likely-sounding text, and sometimes that text is wrong.",
      where: "Stories about AI mistakes, and \"fewer hallucinations\" product claims.",
      mixup: "A hallucination is a wrong answer given confidently. It is not a refusal or a crash.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "parameters", word: "Parameters", say: "puh-RAM-ih-turz", level: "Everyday",
      defs: [
        "The rules a company sets about what its AI is allowed to say",
        "The settings menu where you pick the AI's voice",
        "The internal numbers a model adjusts while it learns. More of them usually means a bigger model"
      ], d: 2,
      uses: [
        "She changed the parameters by typing a new question.",
        "The company says its new model has 70 billion parameters.",
        "The parameters block users from asking about banned topics."
      ], u: 1,
      plain: "Parameters are the numbers inside a model that training adjusts. They hold what the model has learned. A model with 70 billion parameters is bigger than one with 7 billion, but bigger isn't always better.",
      where: "Model announcements: \"70B\", \"billion-parameter model\".",
      mixup: "Model size (parameters) is not the same as how much text it can read at once (the context window).",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "benchmark", word: "Benchmark", say: "BENCH-mark", level: "Everyday",
      defs: [
        "The date a model is released to the public",
        "A standard test used to compare how well different AI models do the same tasks",
        "The price a company charges for each token"
      ], d: 1,
      uses: [
        "The benchmark helps the model remember earlier parts of a chat.",
        "We published the benchmark the day the model went on sale.",
        "The model scored 92% on a coding benchmark, ahead of its rivals."
      ], u: 2,
      plain: "A benchmark is a standard exam for AI. Every model gets the same questions, so scores can be compared. But scores can mislead, for example if a model saw the test questions during training, so a high number doesn't prove it is best for your task.",
      where: "Launch posts that say \"state of the art\", and model leaderboards.",
      mixup: "A high benchmark score is not the same as being good at your job. Check who ran the test.",
      src: "IBM: What are LLM benchmarks?", url: "https://www.ibm.com/think/topics/llm-benchmarks"
    },
    {
      id: "inference", word: "Inference", say: "IN-fer-ents", level: "Everyday",
      defs: [
        "The model's guess about what the user is feeling",
        "Teaching a model new facts after its release",
        "Using a trained model to produce an answer or prediction"
      ], d: 2,
      uses: [
        "Inference is when the model reads the whole internet to learn.",
        "The AI made an inference and quietly updated its own training data.",
        "Running inference on millions of questions a day costs the company a lot."
      ], u: 2,
      plain: "Inference is the moment a trained model does its job: you send a prompt and it produces an answer. Every answer you get from an AI is an inference.",
      where: "Chip and data-center news: \"inference demand\", \"inference costs\".",
      mixup: "Training is learning. Inference is using what was learned.",
      src: GOOGLE.src, url: GOOGLE.url
    }
  ];

  var UNDER_THE_HOOD = [
    {
      id: "llm", word: "LLM", say: "el-el-EM", level: "Starter",
      defs: [
        "A very large AI model trained on huge amounts of text that can write, answer questions and summarize",
        "A legal license for using AI-generated text",
        "A small program that only checks spelling"
      ], d: 0,
      uses: [
        "The LLM is the law that says who owns AI-written essays.",
        "He bought an LLM to store the chatbot's old conversations.",
        "Chatbots like this one are powered by an LLM trained on huge amounts of text."
      ], u: 2,
      plain: "LLM stands for large language model: an AI model with a very large number of parameters, trained on enormous amounts of text. That training lets it write, answer questions and summarize. Today's chatbots are built on LLMs.",
      where: "Nearly every AI product announcement.",
      mixup: "In law, LLM means a master's degree. In AI it means large language model.",
      src: CLAUDE.src, url: CLAUDE.url
    },
    {
      id: "neural-network", word: "Neural network", say: "NOOR-ul NET-wurk", level: "Everyday",
      defs: [
        "A group of computers connected over the internet to share files",
        "A model built from layers of connected units that learns patterns from data",
        "A map of all the people who work on one AI model"
      ], d: 1,
      uses: [
        "The neural network carries files between the company's offices.",
        "The neural network is the team of engineers who build the model.",
        "A neural network learned to recognize cats by studying thousands of photos."
      ], u: 2,
      plain: "A neural network is a type of model made of layers of tiny connected units, loosely inspired by the brain. Each connection holds a number that training adjusts. Most modern AI, including chatbots and image generators, uses neural networks.",
      where: "Explainers about how AI works.",
      mixup: "It is not a network of computers, and it is not a literal brain.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "context-window", word: "Context window", say: "KON-tekst WIN-doh", level: "Everyday",
      defs: [
        "The pop-up window where the chat appears on screen",
        "The time period during which the model was trained",
        "How much text a model can look at and use at one time when it answers"
      ], d: 2,
      uses: [
        "The context window closed as soon as she clicked the X.",
        "The model's context window ends in 2024, so it can't know newer news.",
        "Her whole report fit inside the model's large context window."
      ], u: 2,
      plain: "The context window is the model's working memory: the amount of text it can keep in view at once, measured in tokens. If a conversation or document is longer than the window, the model can't see all of it.",
      where: "Model specs: \"200K context\", \"million-token context window\".",
      mixup: "The context window is how much it can read at once. The training cutoff is a different thing: the date its knowledge stops.",
      src: CLAUDE.src, url: CLAUDE.url
    },
    {
      id: "fine-tuning", word: "Fine-tuning", say: "fyn-TOO-ning", level: "Everyday",
      defs: [
        "Giving an already-trained model extra training on specific examples so it gets better at one job",
        "Adjusting the volume and speed of an AI voice",
        "Fixing a model by deleting its mistakes one by one"
      ], d: 0,
      uses: [
        "She fine-tuned the answer by rewording her prompt three times.",
        "Fine-tuning means training a brand-new model from scratch.",
        "The bank fine-tuned a general model on its own customer-support chats."
      ], u: 2,
      plain: "Fine-tuning takes a model that already learned the basics and trains it a bit more on a narrower set of examples, such as a company's support chats, so it handles that job better.",
      where: "Business AI news about \"custom models\".",
      mixup: "Fine-tuning changes the model itself. Writing a better prompt only changes your question.",
      src: CLAUDE.src, url: CLAUDE.url
    },
    {
      id: "embedding", word: "Embedding", say: "em-BED-ing", level: "Insider",
      defs: [
        "A video or image placed inside a web page",
        "A list of numbers that captures the meaning of text or an image so computers can compare them",
        "A secret code hidden in AI-written text"
      ], d: 1,
      uses: [
        "She pasted the embedding of the chart into her slide deck.",
        "The embedding is a watermark that proves the text was written by AI.",
        "Search finds similar documents by comparing their embeddings."
      ], u: 2,
      plain: "An embedding turns text, an image or a song into a list of numbers so that similar things end up with similar numbers. Computers can then measure how close two things are in meaning, which powers search and recommendations.",
      where: "Search tools and \"chat with your documents\" products.",
      mixup: "Embedding a video in a web page is a different thing.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "multimodal", word: "Multimodal", say: "MUL-tee-MOH-dul", level: "Everyday",
      defs: [
        "Able to work with more than one kind of input or output, such as text, images and audio",
        "Available on many different phones and computers",
        "Built by more than one company working together"
      ], d: 0,
      uses: [
        "The model is multimodal because it runs on both Windows and Mac.",
        "It is multimodal because three companies built it together.",
        "The multimodal model described the photo I uploaded."
      ], u: 2,
      plain: "A multimodal model can handle several kinds of information, such as reading text, looking at pictures and listening to speech, instead of text alone.",
      where: "Launches that say \"now understands images and voice\".",
      mixup: "Multimodal is about kinds of data, not kinds of devices.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "open-weight", word: "Open-weight", say: "OH-pun WAYT", level: "Insider",
      defs: [
        "A model that is free to use on a website but kept secret inside",
        "A model that has been trimmed to be small and light",
        "A model whose trained numbers (weights) are published so others can download and run it"
      ], d: 2,
      uses: [
        "The model is open-weight, so anyone can see all of its training data.",
        "Because the model is open-weight, researchers can download it and run it on their own computers.",
        "The model is open-weight because it can be used in any country."
      ], u: 1,
      plain: "With an open-weight model, the company publishes the trained numbers (the weights) so others can download and run it. That is not the same as fully open source: the training data and code may stay private, and the license can limit how you use it.",
      where: "Release news about downloadable models.",
      mixup: "Open-weight does not mean the training data or code are open too.",
      src: "Open Source Initiative: Open Weights", url: "https://opensource.org/ai/open-weights"
    },
    {
      id: "latency", word: "Latency", say: "LAY-ten-see", level: "Everyday",
      defs: [
        "How long the model's knowledge stays up to date",
        "The delay between sending a request and getting the response back",
        "The amount of electricity the model uses"
      ], d: 1,
      uses: [
        "The model has high latency, so it forgets earlier messages.",
        "Low latency makes the voice assistant feel like a real conversation.",
        "Latency is the number of questions a model can answer in total."
      ], u: 1,
      plain: "Latency is waiting time: how long it takes from pressing send to getting an answer. Lower latency feels faster. Companies compare it alongside accuracy and price.",
      where: "Speed claims: \"faster responses\", \"low-latency\".",
      mixup: "Latency is how long you wait, not how much the model can do.",
      src: CLAUDE.src, url: CLAUDE.url
    }
  ];

  var BUILD_AND_TRUST = [
    {
      id: "agent", word: "Agent", say: "AY-jent", level: "Everyday",
      defs: [
        "A human worker who reviews the AI's answers",
        "AI software that can plan steps and take actions for you, such as using tools, not just answer",
        "A chatbot with a friendly name and photo"
      ], d: 1,
      uses: [
        "The agent is the person at the company who sells you the AI.",
        "An agent is any chatbot that answers in a friendly tone.",
        "The agent booked the meeting, sent the invite and added notes to the calendar."
      ], u: 2,
      plain: "An AI agent doesn't just reply. It can plan, use tools and carry out several steps toward a goal, such as searching, filling in a form or running code. The more it can do, the more it matters to set limits on what it is allowed to do.",
      where: "Headlines about \"agentic\" AI and AI agents.",
      mixup: "A chatbot talks. An agent also acts.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "rag", word: "RAG", say: "RAG", level: "Insider",
      defs: [
        "A technique where the AI first looks up relevant documents, then uses them to write its answer",
        "A method for deleting rude replies after they are written",
        "A ranking of which AI models are fastest"
      ], d: 0,
      uses: [
        "RAG is the process of training a model from scratch on company emails.",
        "Our model got a RAG rating of amber, meaning it is medium risk.",
        "The support bot uses RAG to pull the right help article before it answers."
      ], u: 2,
      plain: "RAG stands for retrieval-augmented generation. Before answering, the system searches a set of documents, such as your company's files, and hands the best matches to the model. That helps answers stay grounded in real material, though it doesn't make mistakes impossible.",
      where: "Business AI tools that answer from your own documents.",
      mixup: "RAG adds documents at question time. Fine-tuning changes the model itself.",
      src: CLAUDE.src, url: CLAUDE.url
    },
    {
      id: "guardrails", word: "Guardrails", say: "GARD-raylz", level: "Everyday",
      defs: [
        "A ranking that lists the best AI models",
        "Safeguards that keep an AI system within safe, allowed behavior",
        "A fence around a data center"
      ], d: 1,
      uses: [
        "The guardrails are the physical locks on the company's servers.",
        "The company added guardrails to stop the chatbot from sharing private data.",
        "Guardrails are the benchmark scores shown in the launch post."
      ], u: 1,
      plain: "Guardrails are controls that keep an AI system from going off course: rules, filters and monitoring that block harmful content or protect private data. IBM compares them to highway barriers. They don't slow the car down, they help keep it on the road.",
      where: "Safety and security news.",
      mixup: "Guardrails reduce risk. They don't guarantee nothing will go wrong.",
      src: "IBM: What are AI guardrails?", url: "https://www.ibm.com/think/topics/ai-guardrails"
    },
    {
      id: "alignment", word: "Alignment", say: "uh-LYN-ment", level: "Insider",
      defs: [
        "Lining up data in neat columns before training",
        "Making two different AI models give identical answers",
        "Steering an AI so its behavior matches human values and goals, to make it helpful, safe and reliable"
      ], d: 2,
      uses: [
        "Alignment is the step where all the training data is sorted alphabetically.",
        "The alignment of the two models means they now share one set of parameters.",
        "Alignment research tries to make sure assistants do what people actually want."
      ], u: 2,
      plain: "Alignment is the work of making an AI act in line with what people intend and value: helpful, honest and safe. It is a big research area and people disagree about how well it is going, so treat bold claims about it with care.",
      where: "Safety debates and research posts from AI labs.",
      mixup: "Alignment is about goals and values, not formatting or matching two models.",
      src: "IBM: What is AI alignment?", url: "https://www.ibm.com/think/topics/ai-alignment"
    },
    {
      id: "bias", word: "Bias", say: "BY-us", level: "Everyday",
      defs: [
        "A model's personal opinion that it chooses to share",
        "A bug that makes the model crash at random",
        "A systematic unfairness or skew in an AI's results, often inherited from its data"
      ], d: 2,
      uses: [
        "The model has bias because it is too slow.",
        "The hiring tool showed bias because it learned from past decisions that favored one group.",
        "Bias means the model refuses to answer questions."
      ], u: 1,
      plain: "In AI, bias means results that systematically favor or disadvantage some people or things, often because the training data did. It is not an opinion the model holds. It is a pattern it picked up.",
      where: "Stories about hiring, lending and face recognition.",
      mixup: "Bias is a pattern in results, not a mood or an opinion.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "overfitting", word: "Overfitting", say: "OH-ver-FIT-ing", level: "Insider",
      defs: [
        "When a model learns its training examples too closely and then does poorly on new ones",
        "When a model is trained for too short a time",
        "When a model gets too big to fit on one computer"
      ], d: 0,
      uses: [
        "Overfitting happens when the model has too few parameters to learn anything.",
        "Overfitting means the model answers too slowly.",
        "The model aced the practice questions but failed new ones, a sign of overfitting."
      ], u: 2,
      plain: "Overfitting is like memorizing the answers to a practice test instead of learning the subject. The model looks great on examples it has seen and stumbles on new ones. It is one reason benchmark scores can mislead.",
      where: "Explainers and benchmark debates.",
      mixup: "Overfitting is memorizing. Underfitting is not learning enough.",
      src: GOOGLE.src, url: GOOGLE.url
    },
    {
      id: "synthetic-data", word: "Synthetic data", say: "sin-THET-ik DAY-tuh", level: "Insider",
      defs: [
        "Data copied from a competitor's AI without permission",
        "Artificial data made on purpose to mimic real data, often used to train or test models",
        "Data that is stored in a cloud service"
      ], d: 1,
      uses: [
        "Synthetic data is the private information a company collects from its users.",
        "The synthetic data was deleted to save storage space.",
        "Engineers trained the model on synthetic data to avoid using real patients' records."
      ], u: 2,
      plain: "Synthetic data is made up on purpose, by computers, to look like real data. It is used when real data is scarce, expensive or private, for example to train a medical model without using real patients' records.",
      where: "Model-training news and privacy debates.",
      mixup: "Synthetic means artificially generated, not stolen or fake in a bad sense.",
      src: "IBM: What is synthetic data?", url: "https://www.ibm.com/think/topics/synthetic-data"
    },
    {
      id: "distillation", word: "Distillation", say: "dis-tih-LAY-shun", level: "Insider",
      defs: [
        "Removing personal data from a training set",
        "Compressing a model's files so they download faster",
        "Training a smaller model to copy the behavior of a bigger one"
      ], d: 2,
      uses: [
        "Distillation removes all private information from a model's answers.",
        "The lab used distillation to make a small, fast model that mimics its flagship.",
        "Distillation is the process of translating a model into another language."
      ], u: 1,
      plain: "In distillation, a big \"teacher\" model's answers are used to train a smaller \"student\" model to behave like it. The student is cheaper and faster to run, often with some loss in ability.",
      where: "Launches of \"mini\" and low-cost models.",
      mixup: "Distillation trains a new small model to imitate a big one. Compression just shrinks the files.",
      src: GOOGLE.src, url: GOOGLE.url
    }
  ];

  /* Starter path: three packs in order. Weekly packs are appended later with track: "weekly". */
  var WORD_PACKS = [
    { id: "w-basics", label: "Words 1: The basics", blurb: "The words behind every AI headline.", track: "starter", checked: CHECKED, words: BASICS },
    { id: "w-under-the-hood", label: "Words 2: Under the hood", blurb: "How models are built and what their specs mean.", track: "starter", checked: CHECKED, words: UNDER_THE_HOOD },
    { id: "w-build-and-trust", label: "Words 3: Building and trusting AI", blurb: "Agents, safeguards and the fairness words.", track: "starter", checked: CHECKED, words: BUILD_AND_TRUST }
  ];

  window.HYPESIFT_WORDS = { checked: CHECKED, packs: WORD_PACKS };
})();
