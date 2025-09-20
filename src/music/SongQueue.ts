export enum LoopType {
    Disabled = "disabled",
    One = "one",
    All = "all",
}

export default class SongQueue<T> {
    private queue: T[] = [];

    private looping: LoopType = LoopType.Disabled;

    private readonly onCurrentSongChanged: (song: T) => Promise<void>;

    private previousCurrentSong: T | undefined;

    private currentSongIndex: number = 0;

    constructor(onCurrentSongChanged?: (song: T) => Promise<void>) {
        this.onCurrentSongChanged = onCurrentSongChanged ?? (() => Promise.resolve());
    }

    private onMaybeSongChanged() {
        const currentSong = this.getCurrentSong();
        if (!currentSong && this.previousCurrentSong !== undefined) {
            this.previousCurrentSong = undefined;
            return;
        }
        if (currentSong !== this.previousCurrentSong) {
            this.previousCurrentSong = currentSong;
            if (currentSong === undefined) {
                return;
            }
            this.onCurrentSongChanged(currentSong);
        }
    }

    /* Call this method when the current song has finished playing */
    notifyCurrentSongFinished() {
        const nextIndex = this.nextSongIndexValue();
        if (nextIndex !== this.currentSongIndex) {
            this.currentSongIndex = nextIndex;
            this.onMaybeSongChanged();
        }
    }

    /* Adds a song or an array of songs to the end of the queue */
    addSongs(song: T[]) {
        this.queue.push(...song);
        this.onMaybeSongChanged();
    }

    /* Adds a song or an array of songs at a specific index in the queue */
    addSongsAt(song: T[], index: number) {
        if (this.queue.length === 0) {
            this.queue.push(...song);
            this.onMaybeSongChanged();
            return;
        }
        if (index < 0 || index > this.queue.length) {
            throw new Error("Invalid index for queue insertion");
        }
        if (index <= this.currentSongIndex) {
            // Adjust current song index if the insertion is before or at the current song
            this.currentSongIndex += song.length;
        }
        this.queue.splice(index, 0, ...song);
        this.onMaybeSongChanged();
    }

    getCurrentSong(): T | undefined {
        return this.queue.at(this.currentSongIndex);
    }

    nextSongIndexValue(): number {
        if (this.queue.length === 0) {
            return 0;
        }
        if (this.looping === LoopType.Disabled) {
            return this.currentSongIndex + 1;
        }
        if (this.looping === LoopType.One) {
            return this.currentSongIndex;
        }
        if (this.looping === LoopType.All) {
            return (this.currentSongIndex + 1) % this.queue.length;
        }
        throw new Error("Invalid loop type");
    }

    /*
  jezeli loop disabled = przesuwa na nastepna, czysci kolejke przed obecna, jezeli koniec to czysta kolejka
  jezeli loop one = przesuwa na nastepna, czysci kolejke przed obecna
  jezeli loop all = przesuwa na nastepna, jezeli koniec to na poczatek
   */
    skipSongs(n: number): void {
        if (n <= 0) {
            throw new Error("Number of songs to skip must be positive");
        }
        if (this.queue.length === 0) {
            return;
        }

        if (this.looping === LoopType.Disabled || this.looping === LoopType.One) {
            this.currentSongIndex += n;
            if (this.currentSongIndex >= this.queue.length) {
                if (this.looping === LoopType.Disabled) {
                    this.queue = [];
                    this.currentSongIndex = 0;
                } else {
                    this.reset();
                }
            } else {
                this.queue = this.queue.slice(this.currentSongIndex);
                this.currentSongIndex = 0;
            }
        }

        if (this.looping === LoopType.All) {
            this.currentSongIndex = (this.currentSongIndex + n) % this.queue.length;
        }

        this.onMaybeSongChanged();
    }

    shuffle() {
        // Do not shuffle the currently playing song
        if (this.queue.length <= 2) {
            return;
        }

        const currentSong = this.queue[this.currentSongIndex];
        const beforeCurrent = this.queue.slice(0, this.currentSongIndex);
        const afterCurrent = this.queue.slice(this.currentSongIndex + 1);
        const toShuffle = [...beforeCurrent, ...afterCurrent];

        for (let i = toShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
        }

        this.queue.splice(
            0,
            this.queue.length,
            ...toShuffle.slice(0, beforeCurrent.length),
            currentSong,
            ...toShuffle.slice(beforeCurrent.length)
        );

        this.onMaybeSongChanged();
    }

    removeSong(index: number) {
        if (index < 0 || index >= this.queue.length) {
            throw new Error("Invalid index for queue removal");
        }

        if (index < this.currentSongIndex) {
            this.currentSongIndex--;
        } else if (
            index === this.currentSongIndex &&
            this.currentSongIndex === this.queue.length - 1
        ) {
            this.currentSongIndex = Math.max(0, this.currentSongIndex - 1);
        }

        this.queue.splice(index, 1);
        this.onMaybeSongChanged();
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    clear() {
        if (this.queue.length === 0) {
            return;
        }

        const currentSong = this.getCurrentSong();
        if (currentSong) {
            this.queue = [currentSong];
            this.currentSongIndex = 0;
        } else {
            this.reset();
        }
    }

    private reset() {
        this.currentSongIndex = 0;
        this.queue = [];
    }

    setLoopType(type: LoopType): LoopType {
        return (this.looping = type);
    }

    get loopType(): LoopType {
        return this.looping;
    }

    getQueue(): readonly T[] {
        return this.queue;
    }
}
