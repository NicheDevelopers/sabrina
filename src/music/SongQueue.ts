export type LoopType = "one" | "all" | "disabled";

export default class SongQueue<T> {
  private queue: T[] = [];
    // =       this.onCurrentSongChanged(value);

  looping: LoopType = "disabled";
  private onCurrentSongChanged: (song: T) => Promise<void>;

  private previousCurrentSong: T | undefined;

  constructor(onCurrentSongChanged?: (song: T) => Promise<void>) {
    this.onCurrentSongChanged = onCurrentSongChanged ?? (() => Promise.resolve());
  }

  private checkIfCurrentSongChanged() {
    const currentSong = this.currentSong();
    if (currentSong !== this.previousCurrentSong) {
      this.previousCurrentSong = currentSong;
      this.onCurrentSongChanged(currentSong);
    }
  }

  addSongs(song: T[]) {
    this.queue.push(...song);
    this.checkIfCurrentSongChanged();
  }

  addSongsAt(song: T[], index: number) {
    this.queue.splice(index, 0, ...song);
    this.checkIfCurrentSongChanged();
  }

  currentSong(): T | undefined {
    return this.queue[0];
  }

  nextSong(): T | undefined {
    if (this.looping == "one") {
      return this.currentSong();
    }
    if (this.looping == "disabled") {
      this.queue.shift();
    }
    if (this.queue.length === 0) {
      return undefined;
    }
    if (this.looping == "all") {
      this.queue.push(this.queue.shift() as T);
    }
    this.checkIfCurrentSongChanged();
    return this.currentSong();
  }

  skipSongs(n: number): T | undefined {
    if (n <= 0) {
      throw new Error("Number of songs to skip must be positive");
    }
    if (this.looping == "one") {
      return this.currentSong();
    }
    n = Math.min(n, this.queue.length);
    if (this.looping == "all") {
      this.addSongs(this.queue.slice(0, n));
    }
    this.queue = this.queue.slice(n);
    this.checkIfCurrentSongChanged();
    return this.currentSong();
  }

  shuffle() {
    // Do not shuffle the currently playing song
    if (this.queue.length <= 2) return;

    const toShuffle = this.queue.slice(1);
    for (let i = toShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
    }
    this.queue = [this.queue[0], ...toShuffle];
    this.checkIfCurrentSongChanged();
  }

  removeSong(index: number) {
    if (index < 0 || index >= this.queue.length) {
      throw new Error("Invalid index for queue removal");
    }
    this.queue.splice(index, 1);
    this.checkIfCurrentSongChanged();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = [this.queue[0]]
  }

  setLoopType(type: LoopType): LoopType {
    return this.looping = type;
  }

  getQueue() {
    return JSON.parse(JSON.stringify(this.queue));
  }
}
