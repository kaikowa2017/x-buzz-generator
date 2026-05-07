export type VideoPromptInput = {
  subject: string;
  genre: string;
  style?: string;
  mood?: string;
  duration?: 5 | 10 | 15 | 30;
  motion?: "slow" | "normal" | "fast";
};

export type VideoPromptOutput = {
  tool: string;
  prompt: string;
  params?: string;
};

const GENRE_MOTION: Record<string, string> = {
  horror: "slow pan, creeping zoom, flickering light, shadow movement",
  business: "smooth dolly, professional cuts, motion graphics",
  lifestyle: "handheld, natural movement, golden hour",
  knowledge: "animated text, icon transitions, clean motion",
};

const MOOD_CAMERA: Record<string, string> = {
  scary: "dutch angle, quick cuts, low angle",
  happy: "wide angle, bright, dynamic",
  serious: "steady cam, dramatic push in",
  calm: "slow motion, aerial, gentle movement",
};

export function generateVideoPrompts(input: VideoPromptInput): VideoPromptOutput[] {
  const motionBase = GENRE_MOTION[input.genre] ?? "cinematic movement";
  const cameraWork = MOOD_CAMERA[input.mood ?? ""] ?? "dynamic camera work";
  const dur = input.duration ?? 10;
  const subject = input.subject;

  return [
    {
      tool: "Runway Gen-4",
      prompt: `${subject}. ${motionBase}. ${cameraWork}. Cinematic quality, ${dur}s clip, photorealistic, 4K.`,
      params: `Duration: ${dur}s, Resolution: 1280x768, Style: cinematic`,
    },
    {
      tool: "Pika 2.0",
      prompt: `${subject}, ${motionBase}, ${cameraWork}, high quality video, smooth motion`,
      params: `Duration: ${dur}s, Motion strength: ${input.motion ?? "normal"}`,
    },
    {
      tool: "Kling AI",
      prompt: `${subject}. Camera: ${cameraWork}. Motion: ${motionBase}. Style: cinematic ${dur}s video.`,
      params: `Mode: Standard, Duration: ${dur}s`,
    },
    {
      tool: "Sora (OpenAI)",
      prompt: `A ${dur}-second ${input.mood ?? "dramatic"} video of ${subject}. ${motionBase}. ${cameraWork}. Cinematic style, high quality.`,
    },
  ];
}
