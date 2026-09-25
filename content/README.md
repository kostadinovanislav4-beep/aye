# Съдържанието на AYE

Тук е всичко, което приложението учи: карти, задачи, текстове, теми за писане. В кода (`src/`) няма съдържание. Форматът е одобрен във Фаза 0 и не се променя без съгласие, защото прогресът се пази по id на елементите.

Схемите са в `src/domain/content/schema.ts`. Примерите по-долу се проверяват автоматично от `scripts/content-readme.test.ts`, така че винаги отговарят на схемата.

## Правилата накратко

- **Вярност.** Цитатите са дума по дума и се вземат от текста на произведението, никога по памет. Всичко, което не е сверено с източник, е `"verified": false` и отива в екрана „За проверка“.
- **Всяка задача има** верен отговор, обяснение защо е верен, за варианти — защо всеки грешен е грешен, тагове, трудност 1–5 и източник или правило.
- **Авторски права.** Пълни текстове само за автори, починали преди 1956 г. (в `bel/texts/`). За останалите — кратки цитати от 1–3 изречения или стиха, резюме и анализ със свои думи и линк към текста.
- **CAE.** Текстовете и скриптовете са оригинални, в стила на изпита. Не се копират материали на Cambridge.
- **Език.** Съдържанието за БЕЛ е на български, за CAE — на английски. Обясненията към потребителя може да са на български.
- **Трудност.** Около 20/30/30/15/5 % за нива 1–5. Качество пред количество.

## Структура

```text
content/
  README.md          този файл
  SOURCES.md         източниците на фактите за изпитите
  tags.json          всички тагове
  rubrics.json       критерии за оценяване на писане и говорене
  bel/
    program.json     учебно-изпитната програма (Фаза 2)
    texts/           пълни текстове с изтекли права (Фаза 2)
    <област>/<тема>.json
  cae/
    <област>/<тема>.json
```

Файловете в `content/` и `content/<изпит>/` са служебни. Всеки JSON файл в `content/<изпит>/<област>/` е **колода**.

## Колода

Една колода е един файл с около 50 елемента от една тема:

```jsonc
{
  "deck": {
    "id": "bel-punct-podchineni", // = името на файла
    "title": "Пунктуация: подчинени изречения",
    "exam": "bel",
    "area": "punct", // = името на папката
    "description": "Запетаи при подчинени изречения.",
  },
  "items": [/* елементи */],
}
```

При build всяка колода става отделна част от приложението и се зарежда само когато трябва.

## Общи полета

| Поле          | Задължително | Значение                                                                               |
| ------------- | ------------ | -------------------------------------------------------------------------------------- |
| `id`          | да           | `<колода>-001`, `-002` … Малки латински букви, цифри и тирета. **Не се сменя никога.** |
| `type`        | да           | Един от 13-те типа по-долу.                                                            |
| `exam`        | да           | `bel` или `cae`; същият като на колодата.                                              |
| `tags`        | да           | Поне един таг от `tags.json`.                                                          |
| `difficulty`  | да           | 1–5.                                                                                   |
| `explanation` | да           | Защо верният отговор е верен. При езиковите норми цитира правилото.                    |
| `source`      | не           | Източник или правило.                                                                  |
| `verified`    | да           | `true` само ако елементът е сверен с източник. Няма стойност по подразбиране.          |

## Маркировка в текстовете

- **Празно място:** `[[1]]`, `[[2]]` … в реда, в който се срещат. Броят им трябва да съвпада с броя на отговорите.
- **Cloze:** `{{c1::отговор}}` или `{{c1::отговор::подсказка}}` — като в Anki. Всяко `cN` е отделна карта; изтриванията с един и същ номер се скриват заедно.
- **Фрагмент:** точен откъс от текста, с интервалите. Ако се среща няколко пъти, `occurrence` казва кой е (по подразбиране първият).
- **Варианти:** `options: [{ "text": "…", "why": "…" }]` и `answer` — индексът на верния вариант, от 0. `why` е задължително за всеки грешен вариант.

## Типове

### `basic` — лице и гръб

Незадължителни: `hint` (подсказка, напр. превод на български) и `example` (примерно изречение).

<!-- пример -->

```json
{
  "id": "cae-vocab-collocations-001",
  "type": "basic",
  "exam": "cae",
  "tags": ["cae.vocab.collocations"],
  "difficulty": 2,
  "front": "shed light on something",
  "back": "to help to explain something that was not clear before",
  "example": "The new study sheds light on how sleep affects memory.",
  "hint": "хвърлям светлина върху нещо",
  "explanation": "Устойчиво словосъчетание: shed + light + on. Не се казва „give light on“ или „make light on“.",
  "verified": false
}
```

### `cloze` — текст със скрити части

Използва се и за цитати: тогава `context` съдържа автора и произведението, а цитатът е взет от текста в `bel/texts/`.

<!-- пример -->

```json
{
  "id": "bel-gram-chlen-001",
  "type": "cloze",
  "exam": "bel",
  "tags": ["bel.gram.chlen"],
  "difficulty": 1,
  "text": "Пълен член се пише, когато съществителното име от мъжки род в единствено число е {{c1::подлог}} или {{c2::сказуемно определение}}.",
  "explanation": "Пълният член (-ът, -ят) се пише при подлог и сказуемно определение. Краткият (-а, -я) се пише, когато думата е допълнение, обстоятелствено пояснение или е след предлог.",
  "source": "Правило за пълния и краткия член",
  "verified": false
}
```

### `mcq` — избираем отговор

4 или 5 варианта. Незадължително: `passage` — текст, към който е въпросът.

<!-- пример -->

```json
{
  "id": "bel-punct-podchineni-001",
  "type": "mcq",
  "exam": "bel",
  "tags": ["bel.punct.podchineni"],
  "difficulty": 2,
  "prompt": "В кое изречение е допусната пунктуационна грешка?",
  "options": [
    {
      "text": "Знам, че ще дойдеш навреме.",
      "why": "Подчиненото изречение „че ще дойдеш навреме“ е отделено правилно — запетаята е пред съюза „че“."
    },
    { "text": "Мисля че, си прав." },
    {
      "text": "Когато завали, ще се приберем.",
      "why": "Подчиненото обстоятелствено изречение в началото се отделя със запетая — тук това е спазено."
    },
    {
      "text": "Книгата, която ми даде, е интересна.",
      "why": "Подчиненото определително изречение е в средата и е отделено със запетаи от двете страни — правилно."
    }
  ],
  "answer": 1,
  "explanation": "Подчиненото изречение „че си прав“ се отделя със запетая пред съюза „че“: „Мисля, че си прав.“ Тук запетаята е поставена след съюза.",
  "source": "Правило за запетая при подчинено изречение",
  "verified": false
}
```

### `short` — кратък свободен отговор

`accepted` съдържа всички приети отговори. Сравнението пренебрегва регистъра, излишните интервали и пунктуацията. `normalize` променя това: `caseSensitive`, `keepPunctuation` (за задачи със запетаи) и `pattern` (регулярен израз, който също приема отговора).

<!-- пример -->

```json
{
  "id": "bel-gram-broyna-forma-001",
  "type": "short",
  "exam": "bel",
  "tags": ["bel.gram.broyna-forma"],
  "difficulty": 1,
  "prompt": "Напишете правилната форма на съществителното в скобите: „Купих два (стол).“",
  "accepted": ["стола", "два стола"],
  "explanation": "След числително бройно съществителните от мъжки род, които не означават лица, са в бройна форма: два стола.",
  "verified": false
}
```

### `edit_text` — редактиране на текст

Всяка грешка се задава с `fragment` (точно както е в текста) и `accepted` (приетите поправки). `tag` казва каква е грешката, `note` обяснява правилото. Позициите се изчисляват автоматично.

<!-- пример -->

```json
{
  "id": "bel-redaktirane-001",
  "type": "edit_text",
  "exam": "bel",
  "tags": ["bel.redaktirane"],
  "difficulty": 2,
  "prompt": "Намерете и поправете грешките в текста.",
  "text": "Вчера срещнах приятелят си, когото не бях виждал от години. Той ми разказа че е записал медицина.",
  "errors": [
    {
      "fragment": "приятелят",
      "accepted": ["приятеля"],
      "tag": "bel.gram.chlen",
      "note": "Думата е допълнение, затова е с кратък член."
    },
    {
      "fragment": "разказа че",
      "accepted": ["разказа, че"],
      "tag": "bel.punct.podchineni",
      "note": "Подчиненото изречение се отделя със запетая пред „че“."
    }
  ],
  "explanation": "В текста има два вида грешки: пълен член вместо кратък и липсваща запетая пред подчинено изречение.",
  "verified": false
}
```

### `text_set` — текст с въпроси

`passages` съдържа един или повече текста с id (`A`, `B` …). Полето `format` определя вида:

| `format`     | За какво                                 | Въпроси                                                                  |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| `questions`  | БЕЛ „работа с текст“, CAE Reading част 5 | `kind: "mcq"` (3–5 варианта) или `kind: "short"`                         |
| `cross_text` | CAE Reading част 6                       | `kind: "match"`, `answer` е id на текст                                  |
| `gapped`     | CAE Reading част 7                       | маркери `[[n]]` в първия текст, `paragraphs` с букви и `gaps` с отговори |
| `matching`   | CAE Reading част 8                       | `kind: "match"`, `answer` е id на текст                                  |

Всеки въпрос има собствено `explanation` и незадължително `points` (точки, по подразбиране 1).

<!-- пример -->

```json
{
  "id": "bel-tekst-informatsionen-001",
  "type": "text_set",
  "format": "questions",
  "exam": "bel",
  "tags": ["bel.tekst.informatsionen"],
  "difficulty": 1,
  "title": "Ново работно време",
  "passages": [
    {
      "id": "A",
      "text": "От 1 октомври градската библиотека удължава работното си време. В делничните дни тя ще е отворена от 9 до 20 ч., а в събота — от 10 до 14 ч. В неделя библиотеката остава затворена."
    }
  ],
  "questions": [
    {
      "kind": "mcq",
      "prompt": "До колко часа ще работи библиотеката в събота?",
      "options": [
        { "text": "До 12 ч.", "why": "В текста няма такъв час." },
        { "text": "До 14 ч." },
        { "text": "До 18 ч.", "why": "В текста няма такъв час." },
        {
          "text": "До 20 ч.",
          "why": "Това е краят на работното време в делничните дни, не в събота."
        }
      ],
      "answer": 1,
      "explanation": "В текста пише: „а в събота — от 10 до 14 ч.“"
    },
    {
      "kind": "short",
      "prompt": "От коя дата влиза в сила новото работно време?",
      "accepted": ["1 октомври", "от 1 октомври", "1.10"],
      "explanation": "Датата е в първото изречение: „От 1 октомври…“."
    }
  ],
  "explanation": "Задачите проверяват извличане на конкретна информация от кратък информационен текст.",
  "verified": false
}
```

### `mc_cloze` — текст с избор за всяко празно място (CAE част 1)

Този тип липсваше в раздел 4.1 на SPEC и е добавен във Фаза 0. Всяко празно място има точно 4 варианта.

<!-- пример -->

```json
{
  "id": "cae-uoe-part1-001",
  "type": "mc_cloze",
  "exam": "cae",
  "tags": ["cae.uoe.part1", "cae.vocab.collocations"],
  "difficulty": 3,
  "title": "A forgotten problem",
  "text": "The report [[1]] light on a problem that had been ignored for years, and the council has now [[2]] to act before the end of the year.",
  "gaps": [
    {
      "options": [
        { "text": "shed" },
        {
          "text": "made",
          "why": "„Make light of“ означава „омаловажавам“ и не се съчетава с „on“."
        },
        { "text": "brought", "why": "„Bring light on“ не е устойчиво словосъчетание." },
        { "text": "gave", "why": "„Give light on“ не е устойчиво словосъчетание." }
      ],
      "answer": 0,
      "explanation": "Устойчивото словосъчетание е „shed light on something“ — изяснявам нещо."
    },
    {
      "options": [
        { "text": "pledged" },
        { "text": "insisted", "why": "След „insist“ идва „on + -ing“, а не инфинитив." },
        {
          "text": "suggested",
          "why": "След „suggest“ идва „-ing“ или подчинено изречение, а не инфинитив."
        },
        { "text": "considered", "why": "След „consider“ идва „-ing“, а не инфинитив." }
      ],
      "answer": 0,
      "explanation": "„Pledge to do something“ — обещавам публично да направя нещо. Само този глагол се съчетава с „to act“."
    }
  ],
  "explanation": "Част 1 проверява колокации и граматичните модели след глаголите.",
  "verified": false
}
```

### `open_cloze` — текст с празни места без варианти (CAE част 2)

<!-- пример -->

```json
{
  "id": "cae-uoe-part2-001",
  "type": "open_cloze",
  "exam": "cae",
  "tags": ["cae.uoe.part2", "cae.grammar.cleft"],
  "difficulty": 3,
  "text": "It was not [[1]] the late 19th century that the theory became widely accepted.",
  "gaps": [
    {
      "accepted": ["until", "till"],
      "explanation": "Конструкцията „It was not until … that …“ подчертава момента, в който нещо най-после се случва."
    }
  ],
  "explanation": "Част 2 проверява граматични думи: предлози, съюзи, наречия, местоимения.",
  "verified": false
}
```

### `word_formation` — словообразуване (CAE част 3)

`stem` е коренната дума, както е дадена на изпита (с главни букви).

<!-- пример -->

```json
{
  "id": "cae-uoe-part3-001",
  "type": "word_formation",
  "exam": "cae",
  "tags": ["cae.uoe.part3", "cae.vocab.word-families"],
  "difficulty": 2,
  "text": "The museum's new exhibition proved [[1]] popular with teenagers.",
  "gaps": [
    {
      "stem": "SURPRISE",
      "accepted": ["surprisingly"],
      "explanation": "Пред прилагателното „popular“ трябва наречие: surprise → surprising → surprisingly."
    }
  ],
  "explanation": "Част 3 проверява словообразуване: представки, наставки и смяна на частта на речта.",
  "verified": false
}
```

### `kwt` — key word transformation (CAE част 4)

`answers` са пълните приети отговори (2 точки). `parts` са двете части, всяка по 1 точка, за частичното точкуване. Отговорът е от 3 до 6 думи и съдържа ключовата дума без промяна; съкратените форми се броят за две думи.

<!-- пример -->

```json
{
  "id": "cae-uoe-part4-001",
  "type": "kwt",
  "exam": "cae",
  "tags": ["cae.uoe.part4", "cae.grammar.passive-reporting"],
  "difficulty": 3,
  "sentence": "People say that the castle was built in the 12th century.",
  "keyword": "SAID",
  "gapped": "The castle [[1]] been built in the 12th century.",
  "answers": ["is said to have"],
  "parts": [{ "accepted": ["is said"] }, { "accepted": ["to have"] }],
  "explanation": "Безличен пасив с глагол за съобщаване: „People say that…“ → „The castle is said to have been built…“. За минало действие се използва перфектен инфинитив.",
  "verified": false
}
```

### `listening_set` — слушане по скрипт (CAE Listening)

Скриптът се чете от гласовия синтез на браузъра. `speakers` задава езика (`en-GB`, `en-US` …), предпочитания глас (`female` или `male`) и темпото (`rate`). `plays` е колко пъти се чува записът. Видове въпроси: `mcq` (3–4 варианта), `completion` (изречение с `[[1]]`, част 2) и `match` (част 4, с `matchingTasks`).

<!-- пример -->

```json
{
  "id": "cae-listening-part1-001",
  "type": "listening_set",
  "exam": "cae",
  "tags": ["cae.listening.part1"],
  "difficulty": 2,
  "part": 1,
  "title": "Extract One: a work report",
  "plays": 2,
  "speakers": [
    { "id": "woman", "name": "Woman", "lang": "en-GB", "voice": "female" },
    { "id": "man", "name": "Man", "lang": "en-GB", "voice": "male" }
  ],
  "scripts": [
    {
      "id": "extract-1",
      "intro": "You hear two colleagues talking about a report.",
      "lines": [
        { "speaker": "woman", "text": "Did you manage to finish the report in the end?" },
        {
          "speaker": "man",
          "text": "Only just. I had to leave out the section on costs, which I'm not thrilled about, but at least it went in on time."
        }
      ]
    }
  ],
  "questions": [
    {
      "kind": "mcq",
      "script": "extract-1",
      "prompt": "How does the man feel about the report?",
      "options": [
        {
          "text": "relieved that it is complete",
          "why": "Той казва, че е пропуснал цял раздел, значи докладът не е пълен."
        },
        { "text": "disappointed that part of it is missing" },
        {
          "text": "worried that it was submitted late",
          "why": "Той казва, че докладът е предаден навреме."
        }
      ],
      "answer": 1,
      "explanation": "„I'm not thrilled about“ изразява недоволство от пропуснатия раздел за разходите."
    }
  ],
  "explanation": "В част 1 има три кратки разговора с по два въпроса. Тук е показан само един въпрос.",
  "verified": false
}
```

### `speaking_task` — говорене (CAE Speaking)

`timers` задава етапите и времето им в секунди. `scene` описва снимките или ситуацията с текст (или прост SVG). `partnerLines` са репликите на симулирания партньор. `rubric` е id от `rubrics.json`.

<!-- пример -->

```json
{
  "id": "cae-speaking-part1-001",
  "type": "speaking_task",
  "exam": "cae",
  "tags": ["cae.speaking.part1"],
  "difficulty": 1,
  "part": 1,
  "title": "Interview: studying and free time",
  "instructions": "Answer the examiner's questions. Give full answers with a reason or an example.",
  "questions": [
    "What do you enjoy most about learning English?",
    "How do you usually spend your weekends?"
  ],
  "timers": [{ "label": "Part 1", "seconds": 120 }],
  "sampleAnswers": [
    {
      "text": "What I enjoy most is being able to follow films and podcasts without subtitles. It feels like a reward for all the effort I've put in.",
      "note": "Изречение с изтъкване (cleft) в началото и конкретна причина."
    }
  ],
  "usefulPhrases": ["What I enjoy most is…", "To be honest, …", "It depends on…"],
  "rubric": "cae-speaking",
  "explanation": "Част 1 е кратко интервю. Оценява се дали отговорите са пълни и естествени, а не само „yes“ или „no“.",
  "verified": false
}
```

### `writing_task` — писане (БЕЛ задача 41 и CAE Writing)

`genre`: `bel-essay`, `bel-interpretive`, `cae-essay`, `cae-letter`, `cae-email`, `cae-proposal`, `cae-report`, `cae-review`. Незадължителни: `targetWords`, `minutes`, `plan` (теза и точки — за темите на задача 41), `samples` (примерни текстове с анотации; `level` е `strong` или `average`, а всяка анотация цитира точен `fragment`) и `phrases` (банка с фрази по групи).

<!-- пример -->

```json
{
  "id": "cae-writing-essay-001",
  "type": "writing_task",
  "exam": "cae",
  "tags": ["cae.writing.essay"],
  "difficulty": 3,
  "genre": "cae-essay",
  "title": "Public spaces in cities",
  "prompt": "Your class has attended a panel discussion on how cities could make public spaces more attractive. You have made the notes below.\n\nWays to improve public spaces:\n- more parks\n- better public transport\n- regular cultural events\n\nSome opinions expressed in the discussion:\n'Green areas make people healthier.'\n'If you can't get there easily, you won't go.'\n'Events bring different communities together.'\n\nWrite an essay discussing two of the ways in your notes. You should explain which way is more important, giving reasons in support of your answer.",
  "targetWords": { "min": 220, "max": 260 },
  "minutes": 45,
  "rubric": "cae-writing",
  "checklist": [
    "Обсъдени са точно два от трите начина.",
    "Ясно е кой начин е по-важен и защо.",
    "Има увод, два основни абзаца и заключение.",
    "Мненията от дискусията са предадени със свои думи.",
    "Обемът е между 220 и 260 думи."
  ],
  "explanation": "Есето в част 1 е задължително. Оценява се по четири критерия: Content, Communicative Achievement, Organisation и Language.",
  "verified": false
}
```

## Тагове

Всички тагове са в `tags.json`: `{ "id": "bel.punct.podchineni", "label": "Запетаи при подчинени изречения" }`. Id-то е йерархично — всяка част с точка трябва да има родител (`bel.punct` → `bel`). Аналитиката събира по началото: `bel.punct` е цялата пунктуация. За БЕЛ частите са на латиница по българските думи, за CAE — на английски. Нов таг се добавя в `tags.json` преди първата употреба.

## Критерии

`rubrics.json` съдържа критериите за оценяване (задача 41, CAE Writing и Speaking). Задачите за писане и говорене ги посочват с `rubric`. Критериите също имат `verified` и се сверяват с официалните документи преди Фаза 4.

## Как се добавя съдържание

1. Прочети този файл.
2. Създай нов файл в правилната папка или допълни колода с по-малко от 50 елемента. id на новите елементи продължават номерацията.
3. Пусни `npm run validate:content` и `npm run test`.
4. Всичко, което не е сверено с източник, остава `"verified": false`.
5. Commit и кратко обобщение: колко елемента, от какъв тип, колко чакат проверка.

При голям обем може да се работи паралелно по области, но всеки резултат минава през валидатора.

## Какво проверява `npm run validate:content`

- схемата на всеки файл (включително непознати полета — правописна грешка в името на поле е грешка);
- уникални id на колоди и елементи;
- повторени условия след нормализиране (регистър, интервали, пунктуация);
- точно един верен отговор и обяснение за всеки грешен вариант;
- празните места: маркерите `[[n]]` отговарят на отговорите;
- фрагментите при редактиране се срещат в текста и не се застъпват;
- KWT: от 3 до 6 думи и ключовата дума;
- тагове само от `tags.json` и критерии само от `rubrics.json`;
- разпределението на трудността (предупреждение, ако се отклонява с повече от 15 пункта);
- колко елемента чакат проверка.
