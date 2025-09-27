export enum LoopType {
    Disabled = "disabled",
    One = "one",
    All = "all",
}

export default class SongQueue<T> {
    private queue: T[] = [];

    private looping: LoopType = LoopType.Disabled;

    private readonly onCurrentSongChanged: (song: T) => Promise<void>;
    private readonly onQueueEmpty: () => Promise<void>;

    private previousSong: T | undefined;

    private currentSongIndex: number = 0;

    constructor(
        onCurrentSongChanged?: (song: T) => Promise<void>,
        onQueueEmpty?: () => Promise<void>
    ) {
        this.onCurrentSongChanged = onCurrentSongChanged ?? (async () => {});
        this.onQueueEmpty = onQueueEmpty ?? (async () => {});
    }

    /* Checks if the current song has changed and calls the callback if it has */
    private onMaybeSongChanged() {
        const currentSong = this.getCurrentSong();
        // No current song, nothing to do
        if (!currentSong) {
            return;
        }

        const isDifferentThanPrevious = currentSong !== this.previousSong;

        // Only keep the entire queue if looping all
        if (this.looping === LoopType.Disabled || this.looping === LoopType.One) {
            this.removeSongsBeforeCurrent();
        }

        // Queue ended
        if (!currentSong && this.previousSong !== undefined) {
            this.reset();
            return;
        }

        const shouldContinuePlaying =
            isDifferentThanPrevious || this.looping !== LoopType.Disabled;

        if (shouldContinuePlaying) {
            this.previousSong = currentSong;
            this.onCurrentSongChanged(currentSong);
        }
    }

    /* Call this method when the current song has finished playing */
    notifyCurrentSongFinished() {
        this.currentSongIndex = this.nextSongIndexValue();
        this.onMaybeSongChanged();
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
    }

    getCurrentSong(): T | undefined {
        return this.queue.at(this.currentSongIndex);
    }

    nextSongIndexValue(): number {
        if (this.isEmpty()) {
            this.reset();
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

        if (this.looping === LoopType.All) {
            this.currentSongIndex = (this.currentSongIndex + n) % this.queue.length;
            this.onMaybeSongChanged();
            return;
        }

        this.currentSongIndex += n;

        if (this.currentSongIndex >= this.queue.length) {
            this.reset();
            this.onMaybeSongChanged();
            return;
        }

        this.removeSongsBeforeCurrent();
        this.currentSongIndex = 0;
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
        if (index === this.currentSongIndex && this.queue.length === 1) {
            this.reset();
            return;
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

    private removeSongsBeforeCurrent() {
        if (this.queue.length === 0) {
            return;
        }
        this.queue = this.queue.slice(this.currentSongIndex);
        this.currentSongIndex = 0;
    }

    private reset() {
        this.previousSong = undefined;
        this.currentSongIndex = 0;
        this.queue = [];
        this.onQueueEmpty();
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
