---
title: An Agent with a Body
subtitle: LLMs as the brain, VLA models as the hands
date: 2026-10-14
description: A graduation-project blueprint for an embodied agent that uses an LLM to plan, task-specific VLA models to act, and memory to connect tasks over time.
seoDescription: "Miles (Siyuan Xue) proposes an embodied agent combining LLM planning, VLA tools, and stores for skills, execution traces and task relationships."
draft: true
figures:
  - id: architecture
    src: essays/embodied-agent/architecture
    alt: "Full architecture diagram: blue input processing feeds gold embedding and storage; green retrieval supplies context to a red MLLM and tools loop; purple agent paths coordinate the system."
    caption: "Figure 1. The proposed architecture, from source processing and retrieval to generation, tool use and orchestration. The arrows describe a blueprint, not a tested system."
  - id: orchestration
    src: essays/embodied-agent/orchestration
    alt: "Architecture diagram with purple paths highlighted from Agent(s) to embodied sources, retrievers, MLLM, tools and context; the remaining paths are greyed out."
    caption: "Figure 2. The familiar agent skeleton: a model, tools, working context and access to longer-term memory. Purple paths highlight the agent's orchestration role."
  - id: generation
    src: essays/embodied-agent/generation
    alt: "Architecture diagram highlighting vector stores containing Skills, Task Map, Traces and Others, alongside the red loop from MLLM to programmatic or pretrained-model tools, control results and back to MLLM."
    caption: "Figure 3. Retrieved context feeds the model; tools produce control results that return to it. The store contents and tool interfaces are central design questions."
  - id: pipelines
    src: essays/embodied-agent/pipelines
    alt: "Architecture diagram highlighting the upper chain from embodied sources through loaders, processing and embedding to vectors, and the lower chain from task query through embedding to retrievers."
    caption: "Figure 4. Two input pipelines: prepare material for storage when needed, and form a retrieval query for each new task."
---

I keep coming back to a question about embodied intelligence: how much should we ask one model to do? A robot needs to understand an instruction, work out a sequence of actions, and carry those actions out in the physical world. Those responsibilities belong to the same task, but they need not all belong to the same model.

I’m Miles (Siyuan Xue), and I’m developing this idea as my final-year project. What follows is an early blueprint, drawn while I begin surveying the topic. It describes the system I want to build and the reasoning behind it; I do not yet have experimental results to report.

## 1. What it is

The idea is an embodied version of a software agent. A large language model, or LLM, remains at its core. Around it sits a set of tools, including vision-language-action (VLA) models capable of particular tasks. The agent would coordinate those tools so that a robot could plan and execute a sequence of tasks within a given scene.

The shorthand is simple: the LLM is the brain, and the VLA models are the hands. By “brain,” I mean the part responsible for interpreting the goal, choosing what to do next, and keeping track of a longer plan. The “hands” turn a chosen task into action. This is a division of responsibilities, not a claim that either kind of model already solves its assigned part completely.

What interests me is the space between a single action and a complete undertaking. Being able to perform individual tasks does not, by itself, specify their order, how one task depends on another, or what to do after a failure. I want to explore whether an agent can provide that coordination while leaving the detailed execution to models suited to it.

## 2. Why it matters

My starting point is the difference between the data available for language models and the data available for robot control. The internet contains abundant text and images. Robot interaction data is much scarcer, and collecting it takes time and resources. That makes me hesitant to assume that simply scaling VLA training will give us the same range of capabilities, on the same terms, that we have seen emerge in LLMs.

This is a motivation for the project, rather than a prediction about the limits of VLAs. I want to make use of the language understanding and planning capabilities that LLMs already offer while investigating how they can contribute to an embodied system. Better coordination would not remove the need for robot data. It might let different models contribute what they are good at without requiring one of them to carry the entire burden.

There are two broad approaches I have in mind. One places a general-purpose VLA at the centre of robot control. The other uses an LLM-based agent to control a robot through action primitives or direct motion commands. Each suggests a different place to draw the boundary between deciding and doing.

If a VLA is made responsible for the whole undertaking, it also inherits semantic interpretation and long-horizon planning. I do not want to take its competence at a particular physical task as evidence that it can reliably handle all those additional duties. Conversely, asking an LLM to issue fine-grained motion commands introduces a different burden: detailed control has to coexist with the model’s inference latency.

The proposed architecture draws the boundary between these responsibilities. The LLM would choose and coordinate tasks; task-specific VLA models would perform the physical work within their capabilities. Whether this division is useful, and how well it holds up during execution, are questions the project still needs to answer.

## 3. The blueprint

The full diagram looks much like a conventional agent system. That resemblance is deliberate. I am starting with an agent structure I understand, then asking what needs to change when its tools act through a robot.

<!-- figure:architecture -->

In the diagram, the central model is labelled MLLM, a multimodal large language model. It occupies the reasoning role. Tools provide the means to act, context serves as short-term working memory, and a retriever gives access to information kept beyond the current task. Material worth retaining can enter the system again as an embodied source and be processed into the store.

<!-- figure:orchestration -->

The purple paths make the agent’s coordinating role easier to see. It connects to the model, the tools, the retriever, the working context and the source-processing path. I want the system to be able to use retained information while acting, and to preserve useful information from execution for later tasks. The arrows indicate those relationships; they do not yet specify the policy for every decision along them.

The more consequential design questions are what the stores should contain and what should count as a tool. A generic box labelled “memory” leaves too much undecided. My initial proposal separates three kinds of material by the purpose they would serve.

**Skills** would be instruction manuals for tools. They would tell the agent when a tool is appropriate and how to use it. A VLA model being available is only part of what the agent needs: it also needs a description that makes the model’s role in a plan understandable.

**Traces** would hold information from task execution that is worth remembering. The aim is to retain material that could guide a similar task later. Deciding which parts of an execution deserve that longer life is still a design problem; the presence of a trace store alone does not make the agent learn from experience.

**A task map** would record relationships among tasks or subtasks within a scene. Those relationships could help determine execution order and possible recovery paths after failure. In a physical setting, returning to an earlier step also requires thinking about what has already changed in the scene. The map would need to help the agent reason about that, rather than merely list task names.

The diagram leaves room for other kinds of stored material. These three categories are a starting point. Although I have grouped them under a vector store in the blueprint, the exact representation of each, especially the relationships in the task map, remains to be worked out.

<!-- figure:generation -->

The red loop connects the model to tools and then brings control results back to the model. Tools may be programmatic or pretrained models; task-specific VLAs would belong to the latter group. Retrieved context would inform the model’s choice of action, and the result of that action would become input to its next decision. A text response is another possible output, but the part I most want to explore is this repeated passage from reasoning to action and back.

There are also two distinct input pipelines. The upper one processes sources for storage: loaders take in material, a processor prepares embodied documents, and embedding models produce vectors. I call this the offline pipeline because it runs when something needs to be deposited in the store, rather than being repeated in full for every task.

<!-- figure:pipelines -->

The lower pipeline runs for each task. It begins with a query formed from the user’s prompt, the environment and the agent’s own state, then embeds that query and retrieves relevant context. This is the online path through which the current task draws on retained material. Keeping the two paths distinct makes their purposes clearer: one prepares what can be remembered, while the other selects what matters now.

That is the blueprint so far. The overall structure is familiar; the difficult work lies in making its components useful to one another. In particular, the tool interfaces, the contents of memory and the relationships between tasks need much more than boxes and arrows. They are what I want the project to investigate.

## 4. Why I’m working on it

I have previously implemented a software agent using LangChain. That gave me a foundation in agent development and made me want to understand these systems more deeply. I also plan to pursue a master’s degree focused on Embodied AI. This project would connect something I have already begun learning with the direction I want to study next.

There is a more personal reason, too. The idea grew out of my recent studies, and I found it captivating as soon as it took shape: an agent that could carry an intention beyond a software interface and into the physical world. I know a diagram is only a beginning. I want to find out what it would take to make it work.
