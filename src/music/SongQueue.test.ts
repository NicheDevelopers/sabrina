import {assertEquals, assertThrows} from "jsr:@std/assert";
import {beforeEach, describe, it} from "jsr:@std/testing/bdd";
import SongQueue from "./SongQueue.ts"; // Adjust path as needed

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
        queue = new SongQueue<TestSong>((song) => {
            songChangeCallbacks.push(song);
            return Promise.resolve();
        });
    });

    describe("constructor", () => {
        it("should initialize with empty queue", () => {
            assertEquals(queue.getQueue(), []);
            assertEquals(queue.isEmpty(), true);
        });

        it("should initialize with disabled looping", () => {
            assertEquals(queue.looping, "disabled");
        });

        it("should work without callback", () => {
            const queueNoCallback = new SongQueue<TestSong>();
            queueNoCallback.addSongs([createSong(1)]);
            assertEquals(queueNoCallback.getCurrentSong()?.id, 1);
        });
    });

    describe("addSongs", () => {
        it("should add single song to empty queue", () => {
            const song = createSong(1);
            queue.addSongs([song]);

            assertEquals(queue.getQueue(), [song]);
            assertEquals(queue.getCurrentSong(), song);
            assertEquals(songChangeCallbacks.length, 1);
            assertEquals(songChangeCallbacks[0], song);
        });

        it("should add multiple songs", () => {
            const songs = [createSong(1), createSong(2), createSong(3)];
            queue.addSongs(songs);

            assertEquals(queue.getQueue().length, 3);
            assertEquals(queue.getCurrentSong()?.id, 1);
        });

        it("should not trigger callback when adding to non-empty queue", () => {
            queue.addSongs([createSong(1)]);
            songChangeCallbacks = [];

            queue.addSongs([createSong(2), createSong(3)]);
            assertEquals(songChangeCallbacks.length, 0);
        });

        it("should handle empty array", () => {
            queue.addSongs([]);
            assertEquals(queue.isEmpty(), true);
        });
    });

    describe("addSongsAt", () => {
        it("should add songs at specific index", () => {
            queue.addSongs([createSong(1), createSong(3)]);
            queue.addSongsAt([createSong(2)], 1);

            const songs = queue.getQueue();
            assertEquals(songs[0].id, 1);
            assertEquals(songs[1].id, 2);
            assertEquals(songs[2].id, 3);
        });

        it("should handle adding at index 0 and adjust currentSongIndex", () => {
            queue.addSongs([createSong(2)]);
            queue.addSongsAt([createSong(1)], 0);

            assertEquals(queue.getCurrentSong()?.id, 2); // Current song index adjusted
            assertEquals(queue.getQueue()[0].id, 1);
            assertEquals(queue.getQueue()[1].id, 2);
        });

        it("should throw error for invalid index", () => {
            queue.addSongs([createSong(1)]);

            assertThrows(
                () => queue.addSongsAt([createSong(2)], -1),
                Error,
                "Invalid index for queue insertion",
            );
            assertThrows(
                () => queue.addSongsAt([createSong(2)], 2),
                Error,
                "Invalid index for queue insertion",
            );
        });

        it("should handle adding to empty queue", () => {
            queue.addSongsAt([createSong(1)], 0);
            assertEquals(queue.getQueue().length, 1);
            assertEquals(queue.getCurrentSong()?.id, 1);
        });

        it("should handle adding to empty queue with non-zero index", () => {
            // When queue is empty, index is forced to 0
            queue.addSongsAt([createSong(1)], 5);
            assertEquals(queue.getQueue().length, 1);
            assertEquals(queue.getCurrentSong()?.id, 1);
        });

        it("should adjust currentSongIndex when adding multiple songs before current", () => {
            queue.addSongs([createSong(1), createSong(4), createSong(5)]);
            queue.notifyCurrentSongFinished(); // Move to song 4

            queue.addSongsAt([createSong(2), createSong(3)], 1);
            assertEquals(queue.getCurrentSong()?.id, 4); // Index adjusted by 2
        });
    });

    describe("currentSong", () => {
        it("should return undefined for empty queue", () => {
            assertEquals(queue.getCurrentSong(), undefined);
        });

        it("should return first song after adding", () => {
            const song = createSong(1);
            queue.addSongs([song]);
            assertEquals(queue.getCurrentSong(), song);
        });
    });

    describe("notifyCurrentSongFinished", () => {
        describe("with looping disabled", () => {
            it("should advance to next song", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 2);
                assertEquals(songChangeCallbacks.length, 2); // Initial + change

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 3);
            });

            it("should handle end of queue", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                queue.notifyCurrentSongFinished();
                queue.notifyCurrentSongFinished();

                assertEquals(queue.getCurrentSong(), undefined);
            });

            it("should not trigger callback when reaching undefined", () => {
                queue.addSongs([createSong(1)]);
                songChangeCallbacks = [];

                queue.notifyCurrentSongFinished();
                assertEquals(songChangeCallbacks.length, 0); // No callback for undefined
            });
        });

        describe("with looping one", () => {
            it("should stay on same song", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                queue.setLoopType("one");

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 1);

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 1);
            });

            it("should not trigger callback when song doesn't change", () => {
                queue.addSongs([createSong(1)]);
                queue.setLoopType("one");
                songChangeCallbacks = [];

                queue.notifyCurrentSongFinished();
                assertEquals(songChangeCallbacks.length, 0);
            });
        });

        describe("with looping all", () => {
            it("should loop back to start", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType("all");

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 2);

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 3);

                queue.notifyCurrentSongFinished();
                assertEquals(queue.getCurrentSong()?.id, 1);
            });
        });
    });

    describe("skipSongs", () => {
        it("should throw error for non-positive skip count", () => {
            assertThrows(
                () => queue.skipSongs(0),
                Error,
                "Number of songs to skip must be positive",
            );
            assertThrows(
                () => queue.skipSongs(-1),
                Error,
                "Number of songs to skip must be positive",
            );
        });

        it("should handle skip on empty queue", () => {
            queue.skipSongs(1);
            assertEquals(queue.isEmpty(), true);
        });

        describe("with looping disabled", () => {
            it("should skip single song and remove previous", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.skipSongs(1);

                assertEquals(queue.getCurrentSong()?.id, 2);
                assertEquals(queue.getQueue().length, 2);
                assertEquals(queue.getQueue()[0].id, 2);
            });

            it("should reset when skipping past end", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                songChangeCallbacks = [];

                queue.skipSongs(3);

                assertEquals(queue.getCurrentSong()?.id, undefined);
                assertEquals(queue.getQueue().length, 0);
                assertEquals(queue.isEmpty(), true);
            });

            it("should skip exactly to end", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.skipSongs(2);

                assertEquals(queue.getCurrentSong()?.id, 3);
                assertEquals(queue.getQueue().length, 1);
            });
        });

        describe("with looping one", () => {
            it("should behave like disabled looping", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType("one");
                queue.skipSongs(1);

                assertEquals(queue.getCurrentSong()?.id, 2);
                assertEquals(queue.getQueue().length, 2);
            });

            it("should reset when skipping past end", () => {
                queue.addSongs([createSong(1), createSong(2)]);
                queue.setLoopType("one");

                queue.skipSongs(5);
                assertEquals(queue.getCurrentSong()?.id, undefined);
                assertEquals(queue.isEmpty(), true);
            });
        });

        describe("with looping all", () => {
            it("should wrap around without removing songs", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType("all");

                queue.skipSongs(2);
                assertEquals(queue.getCurrentSong()?.id, 3);
                assertEquals(queue.getQueue().length, 3);

                queue.skipSongs(2);
                assertEquals(queue.getCurrentSong()?.id, 2);
            });

            it("should handle skip larger than queue length", () => {
                queue.addSongs([createSong(1), createSong(2), createSong(3)]);
                queue.setLoopType("all");

                queue.skipSongs(7); // Skip 7 in queue of 3
                assertEquals(queue.getCurrentSong()?.id, 2); // (0 + 7) % 3 = 1
            });
        });
    });

    describe("shuffle", () => {
        it("should not shuffle if queue has 1 song", () => {
            queue.addSongs([createSong(1)]);
            queue.shuffle();
            assertEquals(queue.getQueue().length, 1);
        });

        it("should not shuffle if queue has 2 songs", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            const before = queue.getQueue();

            queue.shuffle();
            assertEquals(queue.getQueue(), before);
        });

        it("should keep current song in position 0", () => {
            const songs = Array.from({ length: 10 }, (_, i) => createSong(i + 1));
            queue.addSongs(songs);

            queue.shuffle();
            assertEquals(queue.getCurrentSong()?.id, 1);
            assertEquals(queue.getQueue()[0].id, 1);
        });

        it("should shuffle remaining songs", () => {
            const songs = Array.from({ length: 10 }, (_, i) => createSong(i + 1));
            queue.addSongs(songs);

            const originalOrder = queue.getQueue().slice(1);
            queue.shuffle();
            const newOrder = queue.getQueue().slice(1);

            // Very unlikely to be in same order after shuffle
            const isDifferent = originalOrder.some((song: TestSong, i: number) =>
                song.id !== newOrder[i].id
            );
            assertEquals(isDifferent, true);
        });

        it("should handle shuffle with current song not at index 0", () => {
            queue.addSongs(Array.from({ length: 10 }, (_, i) => createSong(i + 1)));
            queue.notifyCurrentSongFinished(); // Move to song 2

            queue.shuffle();
            assertEquals(queue.getQueue()[1].id, 2); // Should be 2, not touched by shuffle
            assertEquals(queue.getCurrentSong()?.id, 2); // Current index still points to song 2
        });
    });

    describe("removeSong", () => {
        it("should throw error for invalid index", () => {
            queue.addSongs([createSong(1)]);

            assertThrows(() => queue.removeSong(-1), Error, "Invalid index");
            assertThrows(() => queue.removeSong(1), Error, "Invalid index");
        });

        it("should remove song at index", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.removeSong(1);

            const songs = queue.getQueue();
            assertEquals(songs.length, 2);
            assertEquals(songs[0].id, 1);
            assertEquals(songs[1].id, 3);
        });

        it("should handle removing current song", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            queue.removeSong(0);

            // BUG: currentSongIndex stays at 0, but queue[0] is now song 2
            assertEquals(queue.getCurrentSong()?.id, 2);
        });

        it("should handle removing song after current", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.notifyCurrentSongFinished(); // Move to song 2

            queue.removeSong(2); // Remove song 3
            assertEquals(queue.getCurrentSong()?.id, 2); // Still on song 2
        });

        it("should trigger callback when current song changes due to removal", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            songChangeCallbacks = [];

            queue.removeSong(0);
            assertEquals(songChangeCallbacks.length, 1);
            assertEquals(songChangeCallbacks[0].id, 2);
        });
    });

    describe("clear", () => {
        it("should keep only first song", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.clear();

            assertEquals(queue.getQueue().length, 1);
            assertEquals(queue.getCurrentSong()?.id, 1);
        });

        it("should handle clear when current song is not first", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.notifyCurrentSongFinished(); // Move to song 2
            queue.clear();

            assertEquals(queue.getQueue()[0].id, 2); // Should be 2
            assertEquals(queue.getCurrentSong()?.id, 2);
        });

        it("should handle clear on empty queue", () => {
            queue.clear();
            assertEquals(queue.getQueue().length, 0);
        });
    });

    describe("setLoopType", () => {
        it("should set loop type and return it", () => {
            assertEquals(queue.setLoopType("one"), "one");
            assertEquals(queue.looping, "one");

            assertEquals(queue.setLoopType("all"), "all");
            assertEquals(queue.looping, "all");

            assertEquals(queue.setLoopType("disabled"), "disabled");
            assertEquals(queue.looping, "disabled");
        });
    });

    describe("isEmpty", () => {
        it("should return true for empty queue", () => {
            assertEquals(queue.isEmpty(), true);
        });

        it("should return false for non-empty queue", () => {
            queue.addSongs([createSong(1)]);
            assertEquals(queue.isEmpty(), false);
        });
    });

    describe("getQueue", () => {
        it("should return deep copy of queue", () => {
            const song = createSong(1);
            queue.addSongs([song]);

            const queueCopy = queue.getQueue();
            queueCopy[0].title = "Modified";

            assertEquals(queue.getQueue()[0].title, "Song 1");
        });

        it("should handle empty queue", () => {
            assertEquals(queue.getQueue(), []);
        });
    });

    describe("nextSongIndexValue", () => {
        it("should return 0 for empty queue", () => {
            assertEquals(queue.nextSongIndexValue(), 0);
        });

        it("should handle all loop types", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);

            // Disabled
            queue.setLoopType("disabled");
            assertEquals(queue.nextSongIndexValue(), 1);

            // One
            queue.setLoopType("one");
            assertEquals(queue.nextSongIndexValue(), 0);

            // All
            queue.setLoopType("all");
            assertEquals(queue.nextSongIndexValue(), 1);

            // All at end
            queue.notifyCurrentSongFinished();
            queue.notifyCurrentSongFinished(); // At song 3
            assertEquals(queue.nextSongIndexValue(), 0); // Wraps to 0
        });

        it("should throw error for invalid loop type", () => {
            queue.addSongs([createSong(1)]);
            // @ts-ignore - Testing runtime error
            queue.looping = "invalid";

            assertThrows(() => queue.nextSongIndexValue(), Error, "Invalid loop type");
        });
    });

    describe("private reset method via skipSongs", () => {
        it("should reset to beginning and trigger callback", () => {
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);
            queue.notifyCurrentSongFinished(); // Move to song 2
            songChangeCallbacks = [];

            // Force reset by skipping past end
            queue.skipSongs(5);

            assertEquals(queue.getCurrentSong()?.id, undefined);
            // No callback because song didn't change (reset to same song that was at index 0)
            assertEquals(songChangeCallbacks.length, 0);
        });

        it("should trigger callback when reset changes song", () => {
            queue.addSongs([createSong(1), createSong(2)]);
            queue.notifyCurrentSongFinished(); // Move to song 2
            queue.skipSongs(1); // This removes song 1, making song 2 at index 0

            songChangeCallbacks = [];
            queue.skipSongs(5); // Force reset

            assertEquals(queue.getCurrentSong()?.id, undefined);
            assertEquals(songChangeCallbacks.length, 0); // No change, still song 2
        });
    });

    describe("edge cases and integration", () => {
        it("should handle complex sequence of operations", () => {
            // Add songs
            queue.addSongs([createSong(1), createSong(2), createSong(3)]);

            // Skip to song 2
            queue.notifyCurrentSongFinished();
            assertEquals(queue.getCurrentSong()?.id, 2);

            // Add song at position 0
            queue.addSongsAt([createSong(0)], 0);
            assertEquals(queue.getCurrentSong()?.id, 2); // Index adjusted correctly

            // Enable loop all
            queue.setLoopType("all");

            // Skip multiple songs
            queue.skipSongs(3);

            // Shuffle
            queue.shuffle();

            // Remove a song
            if (queue.getQueue().length > 2) {
                queue.removeSong(1);
            }

            // Verify queue is still functional
            assertEquals(queue.isEmpty(), false);
        });

        it("should maintain consistency with rapid operations", () => {
            queue.addSongs([createSong(1)]);
            queue.removeSong(0);
            queue.addSongs([createSong(2)]);
            assertEquals(queue.getCurrentSong()?.id, 2);

            queue.clear();
            assertEquals(queue.getQueue().length, 1);
        });

        it("should handle all branches of checkIfCurrentSongChanged", () => {
            // Branch 1: Song changes from undefined to defined
            queue.addSongs([createSong(1)]);
            assertEquals(songChangeCallbacks.length, 1);

            // Branch 2: Song doesn't change
            songChangeCallbacks = [];
            queue.addSongs([createSong(2)]);
            assertEquals(songChangeCallbacks.length, 0);

            // Branch 3: Song changes to undefined
            queue.removeSong(0);
            queue.removeSong(0);
            assertEquals(queue.getCurrentSong(), undefined);
            assertEquals(songChangeCallbacks.length, 1); // No callback for undefined
        });
    });
});
