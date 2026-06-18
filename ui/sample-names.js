// @ts-nocheck

const SAMPLE_NAMES = Object.freeze([
  // Classic
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hiro",
  "Iris", "Jack", "Kai", "Luna", "Max", "Nora", "Oscar", "Panda",
  "Quinn", "River", "Sam", "Tara", "Uma", "Vince", "Wren", "Xena",
  "Yuki", "Zara",

  // AI / Tech
  "Claude", "GPT", "Gemini", "Grok", "Nova", "Orion", "Atlas", "Echo",
  "Pixel", "Neon", "Cortex", "Spark", "Vector", "Logic", "Morph",
  "Synth", "Digi", "Hal", "Dot", "Comet",

  // Nature
  "Blaze", "Frost", "Coral", "Azure", "Storm", "Ash", "Ember", "Fable",
  "Jade", "Raven", "Sage", "Vega", "Aero", "Bolt", "Cove", "Dusk",
  "Flux", "Glimmer", "Maple", "Willow", "Oak", "Ivy", "Fern", "Hazel",
  "Holly", "Juniper", "Laurel", "Lily", "Rose", "Violet", "Daisy",
  "Aster", "Clover", "Iris", "Lavender", "Poppy", "Thorne", "Moss",
  "River", "Brook", "Lake", "Ocean", "Ripple", "Tide", "Waves",
  "Canyon", "Cliff", "Peak", "Summit", "Valley", "Prairie", "Savanna",
  "Tundra", "Jungle", "Forest", "Grove", "Meadow",

  // Celestial
  "Sunny", "Lunar", "Solar", "Cosmo", "Nebula", "Venus", "Mars",
  "Jupiter", "Saturn", "Pluto", "Sol", "Lyra", "Rigel", "Sirius",
  "Vega", "Astra", "Stella", "Celeste", "Nova", "Astro",

  // Mythical
  "Phoenix", "Dragon", "Griffin", "Pegasus", "Kraken", "Yeti", "Sprite",
  "Titan", "Odin", "Thor", "Loki", "Freya", "Zeus", "Athena", "Apollo",
  "Artemis", "Hermes", "Hera", "Ares", "Hades", "Persephone", "Nyx",
  "Eris", "Selene", "Helios", "Eos", "Gaia", "Rhea", "Themis",
  "Nereus", "Triton", "Chimera", "Cerberus", "Medusa", "Minotaur",
  "Cyclops", "Satyr", "Mermaid", "Banshee", "Wisp", "Elf", "Dwarf",
  "Golem", "Basilisk", "Hydra", "Siren", "Harpy", "Centaur",

  // Colors
  "Scarlet", "Crimson", "Ruby", "Cherry", "Candy", "Pepper",
  "Sapphire", "Cobalt", "Indigo", "Mauve", "Lilac", "Plum", "Orchid",
  "Emerald", "Olive", "Mint", "Lime", "Fern", "Chartreuse",
  "Amber", "Gold", "Honey", "Butter", "Saffron", "Topaz", "Ochre",
  "Umber", "Sienna", "Copper", "Bronze", "Rust", "Tawny", "Taupe",
  "Slate", "Smoke", "Charcoal", "Ebony", "Ivory", "Pearl", "Bone",
  "Cream", "Linen", "Cotton", "Wool", "Silk", "Velvet", "Denim",

  // Fantasy
  "Fable", "Myth", "Rune", "Tome", "Scroll", "Wand", "Crystal",
  "Mirror", "Prism", "Shard", "Gem", "Opal", "Onyx", "Jasper",
  "Amber", "Coral", "Pearl", "Topaz", "Garnet", "Beryl", "Agate",
  "Quartz", "Flint", "Steel", "Iron", "Bronze", "Silver", "Golden",
  "Cider", "Maple", "Meadow", "Thistle", "Clover", "Heather",

  // Abstract
  "Axiom", "Beacon", "Cipher", "Drift", "Enigma", "Focal", "Glide",
  "Haven", "Inert", "Jovial", "Kinetic", "Lumen", "Mural", "Nexus",
  "Optic", "Pulse", "Quantum", "Radar", "Snap", "Turbo", "Ultra",
  "Vertex", "Warp", "Zen", "Arc", "Zenith", "Zest",

  // Animals
  "Fox", "Wolf", "Bear", "Lion", "Tiger", "Panther", "Jaguar",
  "Leopard", "Cheetah", "Lynx", "Bobcat", "Ocelot", "Cougar",
  "Eagle", "Hawk", "Falcon", "Raven", "Crow", "Owl", "Finch",
  "Wren", "Jay", "Swift", "Sparrow", "Heron", "Crane", "Stork",
  "Otter", "Beaver", "Sable", "Marten", "Badger", "Raccoon",
  "Koala", "Panda", "Sloth", "Gecko", "Chameleon", "Iguana",
  "Salmon", "Trout", "Pike", "Perch", "Bass", "Koi", "Beta",
  "Cricket", "Mantis", "Beetle", "Bug", "Wasp", "Hornet", "Bee",
  "Macaw", "Cockatoo", "Toucan", "Flamingo", "Peacock", "Swan",

  // Elements
  "Aqua", "Terra", "Ignis", "Aero", "Vapor", "Glacier", "Magma",
  "Tidal", "Solar", "Lunar", "Stellar", "Nebula", "Plasma", "Crystal",
  "Prism", "Flame", "Smoke", "Mist", "Frost", "Dew", "Hail",
  "Quake", "Storm", "Gale", "Zephyr", "Breeze", "Cyclone",

  // Short punchy
  "Axel", "Bane", "Cruz", "Dash", "Edge", "Finn", "Grey", "Hawk",
  "Jett", "Kane", "Lex", "Mace", "Nash", "Onyx", "Pax", "Rex",
  "Slade", "Troy", "Vance", "Wade", "Zane", "Blake", "Chase",
  "Drake", "Flynn", "Grant", "Hale", "Jace", "Kade", "Lane",
  "Neil", "Pierce", "Quade", "Rhys", "Sage", "Vale", "Wyatt",
  "Ash", "Briar", "Cole", "Dale", "Finn", "Gale", "Jade", "Kai",
  "Lee", "Mae", "Niam", "Rae", "Sky", "Teal", "Wren",
])

export { SAMPLE_NAMES }
