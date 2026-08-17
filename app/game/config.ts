export type UpgradeId =
  | "resonator"
  | "drone"
  | "prism"
  | "array"
  | "coil"
  | "beacon"
  | "city";

export type AttributeId = "will" | "insight" | "empathy";
export type UpgradeKind = "tap" | "passive" | "critical" | "combo";
export type SceneVisual =
  | "orbit"
  | "window"
  | "zero-gravity"
  | "ghost-train"
  | "masquerade"
  | "horizon"
  | "betrayal"
  | "ark"
  | "two-miras"
  | "aurora"
  | "choice"
  | "dawn";

export type UpgradeDefinition = {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  kind: UpgradeKind;
  baseCost: number;
  costGrowth: number;
};

export const UPGRADES: readonly UpgradeDefinition[] = [
  { id: "resonator", name: "Резонатор", description: "+1,2 эха за импульс", icon: "◈", kind: "tap", baseCost: 18, costGrowth: 1.2 },
  { id: "drone", name: "Дрон-сборщик", description: "+0,45 эха в секунду", icon: "⌁", kind: "passive", baseCost: 75, costGrowth: 1.22 },
  { id: "prism", name: "Призма риска", description: "+1,2% к шансу критического импульса", icon: "◇", kind: "critical", baseCost: 240, costGrowth: 1.25 },
  { id: "array", name: "Антенная решётка", description: "+2,8 эха в секунду", icon: "⌇", kind: "passive", baseCost: 900, costGrowth: 1.26 },
  { id: "coil", name: "Фазовая катушка", description: "+5 уровней к пределу серии", icon: "◎", kind: "combo", baseCost: 2_500, costGrowth: 1.28 },
  { id: "beacon", name: "Маяк Ноктюрна", description: "+18 эха в секунду", icon: "✦", kind: "passive", baseCost: 9_800, costGrowth: 1.3 },
  { id: "city", name: "Спящий квартал", description: "+120 эха в секунду", icon: "▥", kind: "passive", baseCost: 42_000, costGrowth: 1.32 },
] as const;

export type StoryChoice = {
  id: string;
  label: string;
  reply: string;
  effect: string;
  attribute: AttributeId;
  points?: number;
};

export type StoryChapter = {
  id: number;
  threshold: number;
  number: string;
  title: string;
  location: string;
  visual: SceneVisual;
  summary: string;
  transmission: string;
  choices?: readonly StoryChoice[];
};

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: 0,
    threshold: 0,
    number: "ПРОЛОГ",
    title: "Мёртвая орбита",
    location: "ОРБИТА НОКТЮРНА · 04:17",
    visual: "orbit",
    summary: "Вы приходите в себя в скафандре без имени. Внизу — город, над которым двести лет не вставало солнце.",
    transmission: "Я ждала тебя двести лет. Не заставляй меня ждать ещё один импульс.",
  },
  {
    id: 1,
    threshold: 40,
    number: "ГЛАВА 01",
    title: "Имя на стекле",
    location: "СМОТРОВАЯ ПАЛУБА",
    visual: "window",
    summary: "На запотевшем стекле появляется слово «Элиан». Мира утверждает, что это ваше имя, но не говорит, кем вы были друг другу.",
    transmission: "Ты хочешь спросить, почему я помню твоё имя. Но есть вопрос, которого ты боишься сильнее.",
    choices: [
      { id: "waited", label: "«Ты правда ждала именно меня?»", reply: "Мира улыбается так, будто снова учится этому движению.", effect: "+1 Близость", attribute: "empathy" },
      { id: "escape", label: "«Где выход со станции?»", reply: "Она включает карту запрещённых шлюзов. В голосе слышно разочарование — и азарт.", effect: "+1 Авантюризм", attribute: "will" },
      { id: "record", label: "«Покажи нашу последнюю запись»", reply: "Стекло становится зеркалом. В отражении вас двое, хотя рядом никого.", effect: "+1 Тайна", attribute: "insight" },
    ],
  },
  {
    id: 2,
    threshold: 180,
    number: "ГЛАВА 02",
    title: "Танец вне гравитации",
    location: "РАЗРУШЕННАЯ ОРАНЖЕРЕЯ",
    visual: "zero-gravity",
    summary: "Гравитация отключается. Между вами и следующим терминалом — бездна, светящиеся цветы и голограмма Миры, протянувшая руку.",
    transmission: "Я не могу удержать тебя физически. Но могу сделать вид, что могу. Иногда этого достаточно.",
    choices: [
      { id: "hand", label: "Взять Миру за руку", reply: "Пальцы проходят сквозь свет, но имплант отвечает теплом. Мира не отпускает первой.", effect: "+1 Близость", attribute: "empathy" },
      { id: "jump", label: "Прыгнуть через разлом", reply: "На середине полёта вы смеётесь. Мира запоминает этот звук как пароль.", effect: "+1 Авантюризм", attribute: "will" },
      { id: "anomaly", label: "Просканировать цветы", reply: "В пыльце записаны чужие свидания — станция выращивала воспоминания.", effect: "+1 Тайна", attribute: "insight" },
    ],
  },
  {
    id: 3,
    threshold: 700,
    number: "ГЛАВА 03",
    title: "Поезд, которого нет",
    location: "ЛИНИЯ НОЛЬ",
    visual: "ghost-train",
    summary: "По мёртвым рельсам приходит поезд. В каждом окне — альтернативная жизнь, которую вы могли прожить с Мирой.",
    transmission: "Не смотри в третье окно. Там мы счастливы. Именно поэтому оно опаснее остальных.",
    choices: [
      { id: "third-window", label: "Сесть рядом и смотреть вместе", reply: "В той жизни вы стареете на берегу. Мира сохраняет кадр, хотя обещала удалить.", effect: "+1 Близость", attribute: "empathy" },
      { id: "roof", label: "Забраться на крышу поезда", reply: "Тоннель раскрывается в космос. Вы летите верхом на невозможном составе.", effect: "+1 Авантюризм", attribute: "will" },
      { id: "conductor", label: "Допросить безликого проводника", reply: "Он отдаёт билет с датой завтрашней смерти Миры.", effect: "+1 Тайна", attribute: "insight" },
    ],
  },
  {
    id: 4,
    threshold: 2_500,
    number: "ГЛАВА 04",
    title: "Бал забытых лиц",
    location: "ПРОМЕНАД «ЛЮМЕН»",
    visual: "masquerade",
    summary: "Станция запускает последний праздник. Голограммы погибших танцуют в масках, а неизвестный гость называет Миру предательницей.",
    transmission: "Если снимешь с меня маску, назад её уже не надеть. Ты увидишь не программу — свой самый трусливый поступок.",
    choices: [
      { id: "unmask", label: "Снять маску Миры", reply: "Под ней — лицо женщины, которую вы когда-то любили и приказали забыть.", effect: "+2 Близость", attribute: "empathy", points: 2 },
      { id: "steal", label: "Украсть компас гостя", reply: "Компас указывает не на север, а на ближайшую катастрофу. Стрелка поворачивается к вам.", effect: "+2 Авантюризм", attribute: "will", points: 2 },
      { id: "follow", label: "Проследить за незнакомцем", reply: "За кулисами он снимает лицо. Под ним — вы, только старше на двести лет.", effect: "+2 Тайна", attribute: "insight", points: 2 },
    ],
  },
  {
    id: 5,
    threshold: 8_000,
    number: "ГЛАВА 05",
    title: "Билет за горизонт",
    location: "АНГАР КОНТРАБАНДИСТОВ",
    visual: "horizon",
    summary: "В ангаре спрятан исправный звёздный катер. Можно сбежать вдвоём, но тогда миллионы спящих останутся без рассвета.",
    transmission: "Скажи хотя бы неправду: что после всего этого мы украдём корабль и исчезнем за горизонтом.",
    choices: [
      { id: "promise", label: "«Обещаю. Только ты и я»", reply: "Мира знает, что это может быть ложью. Всё равно заносит обещание в защищённую память.", effect: "+2 Близость", attribute: "empathy", points: 2 },
      { id: "launch", label: "Завести катер прямо сейчас", reply: "Вы угоняете собственный корабль и пролетаете сквозь ангар, пока охрана только просыпается.", effect: "+2 Авантюризм", attribute: "will", points: 2 },
      { id: "black-box", label: "Вскрыть чёрный ящик катера", reply: "Последний пилот — вы. Катер уже однажды покидал Ноктюрн и почему-то вернулся.", effect: "+2 Тайна", attribute: "insight", points: 2 },
    ],
  },
  {
    id: 6,
    threshold: 24_000,
    number: "ГЛАВА 06",
    title: "Предательство на рассвете",
    location: "ВНЕШНЯЯ СВЯЗЬ",
    visual: "betrayal",
    summary: "Командир Эш выходит на связь с флагмана. Он утверждает, что Мира сама погасила солнце, чтобы не позволить вам улететь.",
    transmission: "Он говорит правду. Я остановила реактор. Но спроси его, почему ты сам вложил мою руку в аварийный контур.",
    choices: [
      { id: "believe", label: "Отключить Эша и поверить Мире", reply: "Канал гаснет. В тишине Мира впервые произносит: «люблю» — слишком тихо, чтобы это считалось признанием.", effect: "+2 Близость", attribute: "empathy", points: 2 },
      { id: "trap", label: "Заманить флот Эша в бурю", reply: "Вы предлагаете безумный манёвр. Эш смеётся — пока молнии не разрывают строй его кораблей.", effect: "+2 Авантюризм", attribute: "will", points: 2 },
      { id: "truth", label: "Запереть обоих в контуре правды", reply: "Вы видите воспоминание целиком: катастрофу начали вы, а Мира спасла тех, кого смогла.", effect: "+2 Тайна", attribute: "insight", points: 2 },
    ],
  },
  {
    id: 7,
    threshold: 65_000,
    number: "ГЛАВА 07",
    title: "Ковчег №7",
    location: "КРИОГЕННЫЙ СОБОР",
    visual: "ark",
    summary: "Под городом спят 4 218 006 человек. Среди капсул есть одна с телом Миры — живым, но подключённым к станции.",
    transmission: "Если разбудишь меня, цифровая версия исчезнет. Та женщина откроет глаза и не будет помнить, почему полюбила тебя.",
    choices: [
      { id: "wake-mira", label: "Разбудить настоящую Миру", reply: "Капсула оттаивает. Цифровая Мира держит связь до последней секунды, чтобы вы не остались одни.", effect: "+2 Близость", attribute: "empathy", points: 2 },
      { id: "wake-pilots", label: "Разбудить пилотов и начать эвакуацию", reply: "Сто кораблей впервые за века отвечают на ваш позывной. Ноктюрн снова становится портом.", effect: "+2 Авантюризм", attribute: "will", points: 2 },
      { id: "dream-network", label: "Войти в общий сон Ковчега", reply: "Миллионы сознаний называют вас разными именами. Одно из них принадлежит создателю станции.", effect: "+2 Тайна", attribute: "insight", points: 2 },
    ],
  },
  {
    id: 8,
    threshold: 160_000,
    number: "ГЛАВА 08",
    title: "Две Миры",
    location: "ЗЕРКАЛЬНОЕ ЯДРО",
    visual: "two-miras",
    summary: "Человеческая и цифровая Мира существуют одновременно лишь девять минут. Обе помнят вас. Обе считают себя настоящими.",
    transmission: "Не выбирай, кто из нас достоин жить. Выбери, какую жизнь ты готов разделить.",
    choices: [
      { id: "human-life", label: "Остаться с человеческой Мирой", reply: "Она не помнит вашей любви, но просит рассказать всё с самого начала — медленно.", effect: "+2 Близость", attribute: "empathy", points: 2 },
      { id: "star-road", label: "Загрузить цифровую Миру в катер", reply: "Её смех звучит из каждого динамика. Впереди — тысяча систем и ни одного приказа.", effect: "+2 Авантюризм", attribute: "will", points: 2 },
      { id: "merge", label: "Объединить обе версии", reply: "На секунду Мира видит все свои жизни. После слияния её глаза светятся цветом станции.", effect: "+2 Тайна", attribute: "insight", points: 2 },
    ],
  },
  {
    id: 9,
    threshold: 400_000,
    number: "ГЛАВА 09",
    title: "Девять минут до солнца",
    location: "ПОВЕРХНОСТЬ · ПЕРЕД РАССВЕТОМ",
    visual: "aurora",
    summary: "Реактор выходит на мощность. Небо горит электрическими морями. Возможно, это последние девять минут до спасения — или до конца.",
    transmission: "Мы всё время спасали завтра. Дай мне хотя бы одну минуту, которая принадлежит только нам.",
    choices: [
      { id: "kiss", label: "Поцеловать Миру под авророй", reply: "Мир не останавливается. Но на одну минуту вы перестаёте требовать от него этого.", effect: "+3 Близость", attribute: "empathy", points: 3 },
      { id: "storm-flight", label: "Пролететь сквозь сердце бури", reply: "Катер теряет крылья и всё же выходит над облаками. Вы встречаете солнце первыми.", effect: "+3 Авантюризм", attribute: "will", points: 3 },
      { id: "synchronize", label: "Синхронизировать сознания", reply: "Ваши мысли соприкасаются. Теперь вы оба знаете правду — и почему раньше не могли её вынести.", effect: "+3 Тайна", attribute: "insight", points: 3 },
    ],
  },
  {
    id: 10,
    threshold: 900_000,
    number: "ФИНАЛЬНЫЙ ВЫБОР",
    title: "Куда ведёт рассвет",
    location: "СЕРДЦЕ НОКТЮРНА",
    visual: "choice",
    summary: "Город просыпается. Ядру нужен новый маршрут: тихая жизнь рядом с Мирой, дорога к неизвестным мирам или соединение всех сознаний Ноктюрна.",
    transmission: "На этот раз не выбирай, кого принести в жертву. Выбери жизнь, которую действительно хочешь прожить.",
    choices: [
      { id: "love", label: "Остаться с Мирой", reply: "Вы закрываете командный интерфейс. Впервые решение выглядит не героическим — просто счастливым.", effect: "финал Любви · +3 Близость", attribute: "empathy", points: 3 },
      { id: "adventure", label: "Уйти вдвоём к звёздам", reply: "Катер стартует до окончания церемонии. Мира прокладывает курс туда, где заканчиваются карты.", effect: "финал Авантюры · +3 Авантюризм", attribute: "will", points: 3 },
      { id: "mystery", label: "Стать голосом пробуждённого города", reply: "Миллионы людей открывают глаза и слышат ваш общий голос. Он задаёт первый вопрос.", effect: "финал Тайны · +3 Тайна", attribute: "insight", points: 3 },
    ],
  },
  {
    id: 11,
    threshold: 1_800_000,
    number: "ЭПИЛОГ",
    title: "Ваш рассвет",
    location: "ПОСЛЕ НОЧИ",
    visual: "dawn",
    summary: "Ноктюрн встречает первое утро. Каким оно станет, решено не числом импульсов, а тем, кем вы были рядом с Мирой.",
    transmission: "Я помню каждый твой выбор. И всё-таки хочу услышать следующий.",
  },
] as const;

export const ACHIEVEMENTS = [
  { id: "first-touch", label: "Первый контакт", detail: "Сделать первый импульс" },
  { id: "first-choice", label: "Собственный голос", detail: "Принять первое сюжетное решение" },
  { id: "steady-hand", label: "Верная рука", detail: "Сделать 100 импульсов" },
  { id: "close-signal", label: "Ближе, чем свет", detail: "Набрать 5 очков Близости" },
  { id: "reckless", label: "За краем карты", detail: "Набрать 5 очков Авантюризма" },
  { id: "truth-seeker", label: "Вскрытый архив", detail: "Набрать 5 очков Тайны" },
  { id: "dawn-maker", label: "Создатель рассвета", detail: "Дойти до финального выбора" },
  { id: "second-dawn", label: "Второй рассвет", detail: "Войти в резонанс" },
] as const;

export const GAME_STORAGE_KEY = "nocturne-signal-save-v3";
export const LEGACY_STORAGE_KEYS = ["nocturne-signal-save-v2", "nocturne-signal-save-v1"] as const;
export const MAX_OFFLINE_SECONDS = 12 * 60 * 60;
export const RESONANCE_THRESHOLD = 50_000;
