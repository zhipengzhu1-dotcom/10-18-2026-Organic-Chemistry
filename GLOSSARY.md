# Organic Chemistry Learning Site

A free, donation-supported, interactive chemistry learning site for high-school and undergraduate students, taught through animated, hands-on lessons rather than video.

## Curriculum structure

**Subject**:
A whole field of chemistry, the top level of the site (e.g. Organic Chemistry, Inorganic Chemistry, Electrochemistry).
_Avoid_: Discipline, track, category

**Course**:
An ordered sequence of Units within one Subject, matching a real academic course (e.g. Organic Chemistry I).
_Avoid_: Class, program, path

**Unit**:
One chapter-sized topic within a Course (e.g. "Alkenes: Addition Reactions").
_Avoid_: Chapter, module, section

**Lesson**:
A single 10–15 minute sitting within a Unit, made of 10–15 Steps (never more than 20), shaped Hook → Build → Check → Wrap.
_Avoid_: Module, tutorial, page

**Lesson spec**:
The build-ready description of one Lesson, Step by Step, that agents build from; the owner approves it by merging it.
_Avoid_: Lesson plan, script, outline

**On-ramp**:
The optional first Lesson of a Unit (Lesson 0), intuitive and prerequisite-free for high-schoolers; skipping it does not count against Unit progress, and its Check Problems are never drawn into the Practice Set.
_Avoid_: Intro, primer, beginner mode

**Course map**:
The page showing every Unit of a Course in order, each marked available or coming soon.
_Avoid_: Syllabus, roadmap, curriculum page

**Step**:
One screen of a Lesson, holding one interaction, explanation or question.
_Avoid_: Slide, card, page

**Step id**:
The permanent name of a Step within its Lesson, used in links; unlike the Step's position, it never changes.
_Avoid_: Step number, step index

**Step type**:
The kind of interaction a Step holds (e.g. Explain, Multiple choice, Rank, Draw arrows, Rotate-and-identify).
_Avoid_: Widget, component, question format

**Scene**:
One reusable animation that can appear inside a Step and can also be rendered into video footage.
_Avoid_: Animation, clip, module

**Source note**:
The visible citation attached to a Scene or Problem, naming where each of its chemistry numbers comes from.
_Avoid_: Footnote, credit, reference

## Practice

**Problem**:
One self-contained exercise with a checkable answer (e.g. predict the product, draw the mechanism, rank acidity); a Lesson's Check Steps are Problems, its Build Steps are not.
_Avoid_: Question, exercise, item

**Practice Set**:
The ten mixed Problems that close a Unit, drawn afresh from the Problem Bank on each retake; optional, never locks the next Unit.
_Avoid_: Quiz, test, homework

**Problem Bank**:
The pool of all approved Problems, tagged by Unit, Lesson and difficulty, that Practice Sets and Lessons draw from; a Problem is approved only after the owner checks its answer, Hints and Source note.
_Avoid_: Question bank, item pool

**Hint**:
Feedback written for a specific wrong answer, shown after a first wrong try; a second wrong try reveals the answer.
_Avoid_: Clue, tip

**Answer key**:
The part of a Lesson or Practice Set kept off the page (answers, Hints, reveals, and the numbers cited only in them), fetched by the Step player when grading.
_Avoid_: solutions file, secrets

**Tutor**:
The dev-only helper in the Step player (opened with Ask) that answers a Student's questions about the Step on screen with a leading question or nudge; it never receives the Answer key, and sees the reveal only once the Step can continue.
_Avoid_: AI, assistant, chatbot, agent

**Streak**:
The count of consecutive days on which a Student finished one Lesson or three Problems.
_Avoid_: Chain, combo

**Submitted Problem**:
A Problem proposed by a Student, not yet approved; it enters the Problem Bank only after triage and the owner's review, credited to the Student's chosen display name or "a Student".
_Avoid_: Suggestion, user question

**Mistake report**:
A Student's note that a specific Problem or Step is wrong, sent through the same form as a Submitted Problem; a confirmed one becomes a fix the owner approves.
_Avoid_: Bug report, flag, complaint

## People

**Student**:
Anyone learning on the site; no account is required.
_Avoid_: User, learner, viewer

**Viewer**:
Someone watching the companion YouTube channel, who may become a Student.
_Avoid_: Subscriber, audience member
