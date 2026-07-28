// LOCKED — see PROMPT.md §3.2. Do not add, remove or "improve" colours here.
// Referenced by role name only; never inline a hex literal elsewhere.

export const PALETTE = {
  roomDay: 0xf5ebda, // warm cream, 07:00–17:00
  roomDusk: 0xe3c3a3, // amber, 17:00–21:00
  roomNight: 0x333f52, // deep blue-grey, 21:00–07:00
  floorDay: 0xe0cfb4,
  floorNight: 0x232b3a,

  petBody: 0x7fc4b0, // dusty teal — reads on cream AND at night
  petShade: 0x5fa694,
  petBelly: 0xa8dccb,
  petInk: 0x2b3a38, // eyes, mouth. warm near-black, never pure #000
  petBlush: 0xe8927c,

  accentFood: 0xe8925c,
  accentToy: 0xe2647a,

  uiText: 0x4a4238,
  uiMuted: 0x9a8f80,
} as const
