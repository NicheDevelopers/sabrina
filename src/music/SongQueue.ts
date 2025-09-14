export type LoopType = "one" | "all" | "disabled";

export default class SongQueue<T> {
  private queue: T[] = [];
  looping: LoopType = "disabled";

  push(song: T[]) {
    this.queue.push(...song);
  }

  insertAt(song: T[], index: number) {
    this.queue.splice(index, 0, ...song);
  }

  getCurrent(): T | undefined {
    return this.queue[0];
  }

  next(): T | undefined {
    if (this.looping == "one") {
      return this.getCurrent();
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
    return this.getCurrent();
  }

  skip(n: number): T | undefined {
    if (this.looping == "one") {
      return this.getCurrent();
    }
    n = Math.min(n, this.queue.length);
    if (this.looping == "all"){
      this.push(this.queue.slice(0,n));
    }
    this.queue = this.queue.slice(n);
    return this.getCurrent();
  }

  shuffle() {
    const toShuffle = this.queue.slice(1);
    for (let i = toShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
    }
    this.queue = [this.queue[0], ...toShuffle];
  }

  removeAt(index: number) {
    this.queue.splice(index, 1);
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = this.queue.slice(0, 1);
  }

  setLoopType(type: LoopType): LoopType {
    return this.looping = type;
  }

  getQueue() {
    return JSON.parse(JSON.stringify(this.queue));
  }
}
