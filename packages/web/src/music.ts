export const breakPlaylist: readonly string[] =
  typeof __BREAK_PLAYLIST__ === "undefined" ? [] : __BREAK_PLAYLIST__;
/** Native media playback is an infrastructure boundary; all resources belong to its Effect Layer. */
export class MusicEngine {
  private media: HTMLAudioElement | null = null;
  private index = 0;
  private volume = 15;
  private generation = 0;
  private active = false;
  onState: ((playing: boolean) => void) | null = null;
  constructor(private readonly playlist: readonly string[] = breakPlaylist) {}
  private initialize = () => {
    if (this.media) return this.media;
    if (!this.playlist.length)
      throw new Error("No break music was found in public/music.");
    const media = new window.Audio();
    media.hidden = true;
    media.dataset.breakMusic = "";
    document.body.append(media);
    media.preload = "metadata";
    media.volume = (this.volume / 100) * 0.25;
    media.src = this.playlist[this.index];
    media.addEventListener("ended", this.next);
    media.addEventListener("error", this.failed);
    this.media = media;
    return media;
  };
  private failed = () => {
    this.active = false;
    this.onState?.(false);
  };
  private next = () => {
    if (!this.active || !this.media) return;
    const generation = ++this.generation;
    this.index = (this.index + 1) % this.playlist.length;
    this.media.src = this.playlist[this.index];
    void this.media.play().catch(() => {
      if (generation === this.generation) this.failed();
    });
  };
  play = async () => {
    const generation = ++this.generation;
    this.index = Math.floor(Math.random() * this.playlist.length);
    const media = this.initialize();
    media.src = this.playlist[this.index];
    try {
      await media.play();
    } catch (error) {
      if (generation !== this.generation) return;
      throw error;
    }
    if (generation !== this.generation) return;
    this.active = true;
  };
  pause = () => {
    this.generation++;
    this.active = false;
    this.media?.pause();
  };
  stop = () => {
    this.pause();
    this.index = 0;
    if (this.media) {
      this.media.src = this.playlist[0] ?? "";
      this.media.currentTime = 0;
    }
  };
  setVolume = (volume: number) => {
    this.volume = Math.min(
      100,
      Math.max(0, Number.isFinite(volume) ? volume : 0),
    );
    if (this.media) this.media.volume = (this.volume / 100) * 0.25;
  };
  dispose = () => {
    this.pause();
    if (this.media) {
      this.media.removeEventListener("ended", this.next);
      this.media.removeEventListener("error", this.failed);
      this.media.removeAttribute("src");
      this.media.load();
      this.media.remove();
      this.media = null;
    }
    this.onState = null;
  };
}
