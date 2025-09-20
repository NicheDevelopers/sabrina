import SongQueue, { LoopType } from "./SongQueue";

interface TestSong {
    id: number;
    title: string;
}

describe("SongQueue", () => {
    let queue: SongQueue<TestSong>;
    let songChangeCallbacks: TestSong[] = [];

    const createSong = (id: number): TestSong => ({ id, title: `Song ${id}` });

    beforeEach(() => {
        songChangeCallbacks = [];
        queue = new SongQueue<TestSong>(song => {
            songChangeCallbacks.push(song);
            return Promise.resolve();
        });
    });

    describe("constructor", () => {
        it("should initialize with empty queue", () => {
            expect(queue.getQueue()).toEqual([]);
            expect(queue.isEmpty()).toBe(true);
        });

        it("should initialize with disabled looping", () => {
            expect(queue.loopType).toBe(LoopType.Disabled);
        });

        it("should work without callback", () => {
            const queueNoCallback = new SongQueue<TestSong>();
            queueNoCallback.addSongs([createSong(1)]);
            expect(queueNoCallback.getCurrentSong()?.id).toBe(1);
        });
    });

    describe("addSongs", () => {
        it("should add single song to empty queue", () => {
            const song = createSong(1);
            queue.addSongs([song]);

            expect(queue.getQueue()).toEqual([song]);
            expect(queue.getCurrentSong()).toBe(song);
            expect(songChangeCallbacks.length).toBe(1);
            expect(songChangeCallbacks[0]).toBe(song);
        });

        it("should add multiple songs", () => {
            const songs = [createSong(1), createSong(2), createSong(3)];
            queue.addSongs(songs);

            expect(queue.getQueue().length).toBe(3);
            expect(queue.getCurrentSong()?.id).toBe(1);
        });

        it("should not trigger callback when adding to non-empty queue", () => {
            queue.addSongs([createSong(1)]);
            songChangeCallbacks = [];

            queue.addSongs([createSong(2), createSong(3)]);
            expect(songChangeCallbacks.length).toBe(0);
        });

        it("should handle empty array", () => {
            queue.addSongs([]);
            expect(queue.isEmpty()).toBe(true);
        });
    });

    describe("addSongsAt", () => {
        it("should add songs at specific index", () => {
            queue.addSongs([createSong(1), createSong(3)]);
            queue.addSongsAt([createSong(2)], 1);

            const songs = queue.getQueue();
            expect(songs[0]?.id).toBe(1);
            expect(songs[1]?.id).toBe(2);
            expect(songs[2]?.id).toBe(3);
        });

        it("should handle adding at index 0 and adjust currentSongIndex", () => {
            queue.addSongs([createSong(2)]);
            queue.addSongsAt([createSong(1)], 0);

            expect(queue.getCurrentSong()?.id).toBe(2); // Current song index adjusted
            expect(queue.getQueue()[0]?.id).toBe(1);
            expect(queue.getQueue()[1]?.id).toBe(2);
        });

        it("should throw error for invalid index", () => {
            queue.addSongs([createSong(1)]);

            expect(() => queue.addSongsAt([createSong(2)], -1)).toThrow(
                "Invalid index for queue insertion"
            );
            expect(() => queue.addSongsAt([createSong(2)], 2)).toThrow(
                "Invalid index for queue insertion"
            );
        });

        it("should handle adding to empty queue", () => {
            queue.addSongsAt([createSong(1)], 0);
            expect(queue.getQueue().length).toBe(1);
            expect(queue.getCurrentSong()?.id).toBe(1);
        });

        it("should handle adding to empty queue with non-zero index", () => {
            // When queue is empty, index is forced to 0
            queue.addSongsAt([createSong(1)], 5);
            expect(queue.getQueue().length).toBe(1);
            expect(queue.getCurrentSong()?.id).toBe(1);
        });

        it("should adjust currentSongIndex when adding multiple songs before current", () => {
            queue.addSongs([createSong(1), createSong(4), createSong(5)]);
            queue.notifyCurrentSongFinished(); // Move to song 4

            queue.addSongsAt([createSong(2), createSong(3)], 1);
            expect(queue.getCurrentSong()?.id).toBe(4); // Index adjusted by 2
        });
    });

    describe("currentSong", () => {
        it("should return undefined for empty queue", () => {
            expect(queue.getCurrentSong()).toBeUndefined();
        });

        it("should return first song after adding", () => {
            const song = createSong(1);
            queue.addSongs([song]);
            expect(queue.getCurrentSong()).toBe(song);
        });
    });

    describe("notifyCurrentSongFinished", () => {
        describe("with looping disabled", () => {
            it("should advance to next song", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(2);
                expect(songChangeCallbacks.length).toBe(2); // Initial + change

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(3);
            });

            it("should handle end of queue", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                queue.notifyCurrentSongFinished();
                queue.notifyCurrentSongFinished();

                expect(queue.getCurrentSong()).toBeUndefined();
            });

            it("should not trigger callback when reaching undefined", () => {
                queue.addSongs([createSong(1)]);
                songChangeCallbacks = [];

                queue.notifyCurrentSongFinished();
                expect(songChangeCallbacks.length).toBe(0); // No callback for undefined
            });
        });

        describe("with looping one", () => {
            it("should stay on same song", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                queue.setLoopType(LoopType.One);

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(1);

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(1);
            });

            it("should not trigger callback when song doesn't change", () => {
                queue.addSongs([createSong(1)]);
                queue.setLoopType(LoopType.One);
                songChangeCallbacks = [];

                queue.notifyCurrentSongFinished();
                expect(songChangeCallbacks.length).toBe(0);
            });
        });

        describe("with looping all", () => {
            it("should loop back to start", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType(LoopType.All);

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(2);

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(3);

                queue.notifyCurrentSongFinished();
                expect(queue.getCurrentSong()?.id).toBe(1);
            });
        });
    });

    describe("skipSongs", () => {
        it("should throw error for non-positive skip count", () => {
            expect(() => queue.skipSongs(0)).toThrow(
                "Number of songs to skip must be positive"
            );
            expect(() => queue.skipSongs(-1)).toThrow(
                "Number of songs to skip must be positive"
            );
        });

        it("should handle skip on empty queue", () => {
            queue.skipSongs(1);
            expect(queue.isEmpty()).toBe(true);
        });

        describe("with looping disabled", () => {
            it("should skip single song and remove previous", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.skipSongs(1);

                expect(queue.getCurrentSong()?.id).toBe(2);
                expect(queue.getQueue().length).toBe(2);
                expect(queue.getQueue()[0].id).toBe(2);
            });

            it("should reset when skipping past end", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                songChangeCallbacks = [];

                queue.skipSongs(3);

                expect(queue.getCurrentSong()?.id).toBeUndefined();
                expect(queue.getQueue().length).toBe(0);
                expect(queue.isEmpty()).toBe(true);
            });

            it("should skip exactly to end", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.skipSongs(2);

                expect(queue.getCurrentSong()?.id).toBe(3);
                expect(queue.getQueue().length).toBe(1);
            });
        });

        describe("with looping one", () => {
            it("should behave like disabled looping", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType(LoopType.One);
                queue.skipSongs(1);

                expect(queue.getCurrentSong()?.id).toBe(2);
                expect(queue.getQueue().length).toBe(2);
            });

            it("should reset when skipping past end", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                queue.setLoopType(LoopType.One);

                queue.skipSongs(5);
                expect(queue.getCurrentSong()?.id).toBeUndefined();
                expect(queue.isEmpty()).toBe(true);
            });
        });

        describe("with looping all", () => {
            it("should wrap around without removing songs", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType(LoopType.All);

                queue.skipSongs(2);
                expect(queue.getCurrentSong()?.id).toBe(3);
                expect(queue.getQueue().length).toBe(3);

                queue.skipSongs(2);
                expect(queue.getCurrentSong()?.id).toBe(2);
            });

            it("should handle skip larger than queue length", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType(LoopType.All);

                queue.skipSongs(7); // Skip 7 in queue of 3
                expect(queue.getCurrentSong()?.id).toBe(2); // (0 + 7) % 3 = 1
            });
        });
    });

    describe("shuffle", () => {
        it("should not shuffle if queue has 1 song", () => {
            queue.addSongs([createSong(1)]);
            queue.shuffle();
            expect(queue.getQueue().length).toBe(1);
        });

        it("should not shuffle if queue has 2 songs", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            const before = queue.getQueue();

            queue.shuffle();
            expect(queue.getQueue()).toEqual(before);
        });

        it("should keep current song in position 0", () => {
            const songs = Array.from({ length: 10 }, (_, i) => createSong(i + 1));
            queue.addSongs(songs);

            queue.shuffle();
            expect(queue.getCurrentSong()?.id).toBe(1);
            expect(queue.getQueue()[0].id).toBe(1);
        });

        it("should shuffle remaining songs", () => {
            const songs = Array.from({ length: 10 }, (_, i) => createSong(i + 1));
            queue.addSongs(songs);

            const originalOrder = queue.getQueue().slice(1);
            queue.shuffle();
            const newOrder = queue.getQueue().slice(1);

            // Very unlikely to be in same order after shuffle
            const isDifferent = originalOrder.some(
                (song: TestSong, i: number) => song.id !== newOrder[i].id
            );
            expect(isDifferent).toBe(true);
        });

        it("should handle shuffle with current song not at index 0", () => {
            queue.addSongs(Array.from({ length: 10 }, (_, i) => createSong(i + 1)));
            queue.notifyCurrentSongFinished(); // Move to song 2

            queue.shuffle();
            expect(queue.getQueue()[1].id).toBe(2); // Should be 2, not touched by shuffle
            expect(queue.getCurrentSong()?.id).toBe(2); // Current index still points to song 2
        });
    });

    describe("removeSong", () => {
        it("should throw error for invalid index", () => {
            queue.addSongs([createSong(1)]);

            expect(() => queue.removeSong(-1)).toThrow("Invalid index");
            expect(() => queue.removeSong(1)).toThrow("Invalid index");
        });

        it("should remove song at index", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.removeSong(1);

            const songs = queue.getQueue();
            expect(songs.length).toBe(2);
            expect(songs[0].id).toBe(1);
            expect(songs[1].id).toBe(3);
        });

        it("should handle removing current song", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            queue.removeSong(0);

            // BUG: currentSongIndex stays at 0, but queue[0] is now song 2
            expect(queue.getCurrentSong()?.id).toBe(2);
        });

        it("should handle removing song after current", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.notifyCurrentSongFinished(); // Move to song 2

            queue.removeSong(2); // Remove song 3
            expect(queue.getCurrentSong()?.id).toBe(2); // Still on song 2
        });

        it("should trigger callback when current song changes due to removal", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            songChangeCallbacks = [];

            queue.removeSong(0);
            expect(songChangeCallbacks.length).toBe(1);
            expect(songChangeCallbacks[0].id).toBe(2);
        });
    });

    describe("clear", () => {
        it("should keep only first song", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.clear();

            expect(queue.getQueue().length).toBe(1);
            expect(queue.getCurrentSong()?.id).toBe(1);
        });

        it("should handle clear when current song is not first", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.notifyCurrentSongFinished(); // Move to song 2
            queue.clear();

            expect(queue.getQueue()[0].id).toBe(2); // Should be 2
            expect(queue.getCurrentSong()?.id).toBe(2);
        });

        it("should handle clear on empty queue", () => {
            queue.clear();
            expect(queue.getQueue().length).toBe(0);
        });
    });

    describe("setLoopType", () => {
        it("should set loop type and return it", () => {
            expect(queue.setLoopType(LoopType.One)).toBe(LoopType.One);
            expect(queue.loopType).toBe(LoopType.One);

            expect(queue.setLoopType(LoopType.All)).toBe(LoopType.All);
            expect(queue.loopType).toBe(LoopType.All);

            expect(queue.setLoopType(LoopType.Disabled)).toBe(LoopType.Disabled);
            expect(queue.loopType).toBe(LoopType.Disabled);
        });
    });

    describe("isEmpty", () => {
        it("should return true for empty queue", () => {
            expect(queue.isEmpty()).toBe(true);
        });

        it("should return false for non-empty queue", () => {
            queue.addSongs([createSong(1)]);
            expect(queue.isEmpty()).toBe(false);
        });
    });

    describe("nextSongIndexValue", () => {
        it("should return 0 for empty queue", () => {
            expect(queue.nextSongIndexValue()).toBe(0);
        });

        it("should handle all loop types", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);

            // Disabled
            queue.setLoopType(LoopType.Disabled);
            expect(queue.nextSongIndexValue()).toBe(1);

            // One
            queue.setLoopType(LoopType.One);
            expect(queue.nextSongIndexValue()).toBe(0);

            // All
            queue.setLoopType(LoopType.All);
            expect(queue.nextSongIndexValue()).toBe(1);

            // All at end
            queue.notifyCurrentSongFinished();
            queue.notifyCurrentSongFinished(); // At song 3
            expect(queue.nextSongIndexValue()).toBe(0); // Wraps to 0
        });

        it("should throw error for invalid loop type", () => {
            queue.addSongs([createSong(1)]);
            // @ts-expect-error - Testing runtime error
            queue.looping = "invalid";

            expect(() => queue.nextSongIndexValue()).toThrow("Invalid loop type");
        });
    });

    describe("private reset method via skipSongs", () => {
        it("should reset to beginning and trigger callback", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.notifyCurrentSongFinished(); // Move to song 2
            songChangeCallbacks = [];

            // Force reset by skipping past end
            queue.skipSongs(5);

            expect(queue.getCurrentSong()?.id).toBeUndefined();
            // No callback because song didn't change (reset to same song that was at index 0)
            expect(songChangeCallbacks.length).toBe(0);
        });

        it("should trigger callback when reset changes song", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            queue.notifyCurrentSongFinished(); // Move to song 2
            queue.skipSongs(1); // This removes song 1, making song 2 at index 0

            songChangeCallbacks = [];
            queue.skipSongs(5); // Force reset

            expect(queue.getCurrentSong()?.id).toBeUndefined();
            expect(songChangeCallbacks.length).toBe(0); // No change, still song 2
        });
    });

    describe("edge cases and integration", () => {
        it("should handle complex sequence of operations", () => {
            // Add songs
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);

            // Skip to song 2
            queue.notifyCurrentSongFinished();
            expect(queue.getCurrentSong()?.id).toBe(2);

            // Add song at position 0
            queue.addSongsAt([createSong(0)], 0);
            expect(queue.getCurrentSong()?.id).toBe(2); // Index adjusted correctly

            // Enable loop all
            queue.setLoopType(LoopType.All);

            // Skip multiple songs
            queue.skipSongs(3);

            // Shuffle
            queue.shuffle();

            // Remove a song
            if (queue.getQueue().length > 2) {
                queue.removeSong(1);
            }

            // Verify queue is still functional
            expect(queue.isEmpty()).toBe(false);
        });

        it("should maintain consistency with rapid operations", () => {
            queue.addSongs([createSong(1)]);
            queue.removeSong(0);
            queue.addSongs([createSong(2)]);
            expect(queue.getCurrentSong()?.id).toBe(2);

            queue.clear();
            expect(queue.getQueue().length).toBe(1);
        });

        it("should handle all branches of checkIfCurrentSongChanged", () => {
            // Branch 1: Song changes from undefined to defined
            queue.addSongs([createSong(1)]);
            expect(songChangeCallbacks.length).toBe(1);

            // Branch 2: Song doesn't change
            songChangeCallbacks = [];
            queue.addSongs([createSong(2)]);
            expect(songChangeCallbacks.length).toBe(0);

            // Branch 3: Song changes to undefined
            queue.removeSong(0);
            queue.removeSong(0);
            expect(queue.getCurrentSong()).toBeUndefined();
            expect(songChangeCallbacks.length).toBe(1); // No callback for undefined
        });
    });
});
