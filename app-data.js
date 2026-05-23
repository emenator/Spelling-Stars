(function attachSpellingQuizData(root) {
  const clusterText = `
the, of, and, a, cat, mat, sat, hat, bat, rat
to, in, is, you, man, can, ran, pan, fan, van
that, it, he, was, map, cap, nap, tap, lap, clap
for, on, are, as, back, sack, black, snack, pack, track
with, his, they, I, sit, hit, bit, fit, pit, kit
at, be, this, have, big, pig, dig, wig, fig, twig
from, or, one, had, pin, thin, spin, skin, win, chin
by, words, but, not, sick, kick, brick, stick, pick, trick
what, all, were, we, hot, pot, not, lot, dot, spot
when, your, can, said, mop, top, hop, drop, pop, stop
there, use, an, each, job, mob, cob, rob, sob, blob
which, she, do, how, sock, rock, block, clock, lock, dock
their, if, will, up, cut, but, hut, shut, nut, strut
other, about, out, many, bug, hug, rug, mug, jug, plug
then, them, these, so, sun, run, fun, bun, pun, spun
some, her, would, make, duck, luck, suck, stuck, truck, puck
like, him, into, time, pet, get, wet, let, net, jet
has, look, two, more, red, bed, fed, sled, led, shed
write, go, see, number, men, hen, pen, ten, den, glen
no, way, could, people, tell, fell, sell, well, bell, smell
my, than, first, water, bad, hat, glad, mad, sad, dad
been, called, who, oil, win, lip, kid, ship, dip, fish
sit, now, find, long, mom, fox, chop, shop, dog, log
down, day, did, get, bus, truck, must, cut, pup, gum
come, made, may, part, web, tell, less, shell, leg, nest
make, page, race, tape, name, shake, plants, animals, lake, stems
way, pay, stay, clay, play, tray, roots, leaves, spray, grow
nice, drive, mine, wise, dime, five, shelter, nesting, hide, habitat
dry, cry, sky, shy, spy, try, light, soil, fly, sprout
nose, bone, code, spoke, hole, note, weather, seasons, rope, climate
low, snow, grow, flow, show, blow, above, below, throw, beside
coat, boat, float, soak, load, soap, solid, liquid, roast, matter
hook, took, good, stood, wood, look, gas, heated, cook, melted
cow, plow, brown, town, clown, tower, citizen, vote, gown, leader
moon, spoon, tooth, broom, roof, pool, elected, rights, zoom, freedom
deep, feel, green, seed, need, free, globe, symbol, tree, flag
`;

  const visualHints = {
    animals: "🐾",
    back: "🔙",
    bat: "🦇",
    bed: "🛏️",
    bell: "🔔",
    big: "⬆️",
    black: "⚫",
    block: "🧱",
    boat: "⛵",
    bone: "🦴",
    book: "📚",
    brick: "🧱",
    broom: "🧹",
    brown: "🟤",
    bug: "🐛",
    bun: "🍞",
    bus: "🚌",
    cap: "🧢",
    cat: "🐱",
    chin: "🙂",
    clay: "🧱",
    clock: "🕒",
    clown: "🤡",
    coat: "🧥",
    cow: "🐄",
    cry: "😢",
    day: "☀️",
    deep: "⬇️",
    dig: "⛏️",
    dime: "🪙",
    dock: "⚓",
    dog: "🐶",
    dot: "🔵",
    duck: "🦆",
    fan: "🪭",
    fig: "🫒",
    fish: "🐟",
    flag: "🏳️",
    fly: "🪰",
    fox: "🦊",
    free: "🆓",
    gas: "⛽",
    globe: "🌎",
    gown: "🥻",
    green: "🟢",
    gum: "🍬",
    hat: "🎩",
    hen: "🐔",
    hole: "🕳️",
    hot: "🔥",
    hug: "🤗",
    hut: "🏠",
    jet: "✈️",
    jug: "🏺",
    kid: "🧒",
    kit: "🧰",
    lake: "🏞️",
    leaves: "🍃",
    leg: "🦵",
    light: "💡",
    lock: "🔒",
    log: "🪵",
    man: "👨",
    map: "🗺️",
    mat: "🟫",
    melted: "🫠",
    men: "👥",
    mom: "👩",
    moon: "🌙",
    mop: "🧹",
    mug: "☕",
    name: "🏷️",
    nap: "💤",
    nest: "🪺",
    net: "🥅",
    nose: "👃",
    note: "📝",
    nut: "🥜",
    oil: "🛢️",
    page: "📄",
    pan: "🍳",
    pen: "✏️",
    pet: "🐾",
    pig: "🐷",
    pin: "📌",
    pit: "🕳️",
    plants: "🌱",
    play: "▶️",
    plug: "🔌",
    pool: "🏊",
    pot: "🍲",
    pup: "🐶",
    race: "🏁",
    rain: "🌧️",
    rat: "🐀",
    red: "🔴",
    ring: "💍",
    rob: "🥷",
    rock: "🪨",
    rocket: "🚀",
    roof: "🏠",
    roots: "🌱",
    rope: "🪢",
    rug: "🟫",
    sack: "🛍️",
    sad: "😢",
    sat: "🪑",
    seasons: "🍂",
    seed: "🌱",
    shelter: "🏠",
    shell: "🐚",
    ship: "🚢",
    shoe: "👟",
    shop: "🛒",
    sit: "🪑",
    skin: "🖐️",
    sky: "☁️",
    sled: "🛷",
    smell: "👃",
    snack: "🍪",
    snow: "❄️",
    soap: "🧼",
    sock: "🧦",
    soil: "🟫",
    solid: "🧊",
    spoon: "🥄",
    spray: "💦",
    sprout: "🌱",
    star: "⭐",
    stems: "🌿",
    stick: "🪵",
    stop: "🛑",
    sun: "☀️",
    symbol: "🔣",
    table: "🪑",
    tape: "📼",
    tap: "🚰",
    ten: "🔟",
    tooth: "🦷",
    tower: "🗼",
    track: "🛤️",
    train: "🚆",
    tree: "🌳",
    truck: "🚚",
    van: "🚐",
    vote: "🗳️",
    water: "💧",
    web: "🕸️",
    weather: "🌦️",
    wig: "💇",
    win: "🏆",
    wood: "🪵",
    words: "🔤",
    write: "✍️",
    zoom: "🔍",
  };

  const clusters = clusterText
    .trim()
    .split("\n")
    .map((line, index) => {
      const words = line.split(",").map((word) => word.trim().toLowerCase());
      return {
        id: `cluster-${index + 1}`,
        name: `Cluster ${index + 1}: ${words.slice(0, 3).join(", ")}`,
        words,
        visualHints: Object.fromEntries(words.map((word) => [word, visualHints[word] || ""])),
      };
    });

  root.SpellingQuizData = {
    clusters,
    visualHints,
  };
})(typeof window !== "undefined" ? window : globalThis);
