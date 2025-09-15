import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std/testing/asserts.ts";
import SongQueue, { LoopType } from "./SongQueue.ts";
import { assertThrows } from "@std/assert";

Deno.test("SongQueue - Initialization", () => {
  const queue = new SongQueue<string>();
  assertEquals(queue.isEmpty(), true);
  assertEquals(queue.currentSong(), undefined);
  assertEquals(queue.getQueue().length, 0);
  assertEquals(queue.looping, "disabled");
});

Deno.test("SongQueue - Adding Songs", () => {
  const queue = new SongQueue<string>();

  // Add songs to empty queue
  queue.addSongs(["song1", "song2"]);
  assertEquals(queue.getQueue(), ["song1", "song2"]);
  assertEquals(queue.currentSong(), "song1");

  // Add more songs
  queue.addSongs(["song3"]);
  assertEquals(queue.getQueue(), ["song1", "song2", "song3"]);
});

Deno.test("SongQueue - Adding Songs at Index", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song3"]);

  // Add at valid index
  queue.addSongsAt(["song2"], 1);
  assertEquals(queue.getQueue(), ["song1", "song2", "song3"]);

  // Add at beginning
  queue.addSongsAt(["song0"], 0);
  assertEquals(queue.getQueue(), ["song0", "song1", "song2", "song3"]);

  // Add at end
  queue.addSongsAt(["song4"], 4);
  assertEquals(queue.getQueue(), ["song0", "song1", "song2", "song3", "song4"]);

  // Add at negative index (should handle this case)
  queue.addSongsAt(["songNeg"], -1);
  // This might fail depending on how your implementation handles negative indices

  // Add at out-of-bounds index (should handle this case)
  queue.addSongsAt(["songOOB"], 100);
  // This might fail depending on how your implementation handles out-of-bounds indices
});

Deno.test("SongQueue - Current Song", () => {
  const queue = new SongQueue<string>();

  // Empty queue
  assertEquals(queue.currentSong(), undefined);

  // With songs
  queue.addSongs(["song1", "song2"]);
  assertEquals(queue.currentSong(), "song1");

  // After removing first song
  queue.removeSong(0);
  assertEquals(queue.currentSong(), "song2");
});

Deno.test("SongQueue - Next Song with Loop Disabled", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);
  queue.setLoopType("disabled");

  // First call to nextSong
  const next1 = queue.nextSong();
  // This will likely fail - your implementation shifts but doesn't return the new current song
  assertEquals(next1, "song2");
  assertEquals(queue.getQueue(), ["song2", "song3"]);

  // Second call to nextSong
  const next2 = queue.nextSong();
  assertEquals(next2, "song3");
  assertEquals(queue.getQueue(), ["song3"]);

  // Last song
  const next3 = queue.nextSong();
  assertEquals(next3, undefined);
  assertEquals(queue.getQueue(), []);
});

Deno.test("SongQueue - Next Song with Loop One", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);
  queue.setLoopType("one");

  // Multiple calls to nextSong should always return the same song
  assertEquals(queue.nextSong(), "song1");
  assertEquals(queue.nextSong(), "song1");
  assertEquals(queue.getQueue(), ["song1", "song2", "song3"]);
});

Deno.test("SongQueue - Next Song with Loop All", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);
  queue.setLoopType("all");

  // First call to nextSong
  const next1 = queue.nextSong();
  // This will likely fail - your implementation shifts but doesn't return the new current song
  assertEquals(next1, "song2");
  assertEquals(queue.getQueue(), ["song2", "song3", "song1"]);

  // Second call to nextSong
  const next2 = queue.nextSong();
  assertEquals(next2, "song3");
  assertEquals(queue.getQueue(), ["song3", "song1", "song2"]);

  // Third call to nextSong (loops back to first)
  const next3 = queue.nextSong();
  assertEquals(next3, "song1");
  assertEquals(queue.getQueue(), ["song1", "song2", "song3"]);
});

Deno.test("SongQueue - Next Song with Empty Queue", () => {
  const queue = new SongQueue<string>();
  assertEquals(queue.nextSong(), undefined);

  // Test all loop types with empty queue
  queue.setLoopType("one");
  assertEquals(queue.nextSong(), undefined);

  queue.setLoopType("all");
  assertEquals(queue.nextSong(), undefined);
});

Deno.test("SongQueue - Skip Songs with Loop Disabled", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3", "song4"]);
  queue.setLoopType("disabled");

  // Skip 2 songs
  const result = queue.skipSongs(2);
  assertEquals(result, "song3");
  assertEquals(queue.getQueue(), ["song3", "song4"]);

  // Skip more songs than in queue
  const emptyQueue = new SongQueue<string>();
  emptyQueue.addSongs(["song1", "song2"]);
  const emptyResult = emptyQueue.skipSongs(5);
  assertEquals(emptyResult, undefined);
  assertEquals(emptyQueue.isEmpty(), true);
});

Deno.test("SongQueue - Skip Songs with Loop One", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);
  queue.setLoopType("one");

  // Skip should not change anything
  const result = queue.skipSongs(2);
  assertEquals(result, "song1");
  assertEquals(queue.getQueue(), ["song1", "song2", "song3"]);
});

Deno.test("SongQueue - Skip Songs with Loop All", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3", "song4"]);
  queue.setLoopType("all");

  // Skip 2 songs
  const result = queue.skipSongs(2);
  assertEquals(result, "song3");
  // This will likely fail - your implementation adds songs before removing them
  assertEquals(queue.getQueue(), ["song3", "song4", "song1", "song2"]);
});

Deno.test("SongQueue - Skip Songs with Negative or Zero Count", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);

  // Skip 0 songs
  assertThrows(
    () => queue.skipSongs(0),
    Error,
    "Number of songs to skip must be positive",
  );

  // Skip negative number of songs
  assertThrows(
    () => queue.skipSongs(-1),
    Error,
    "Number of songs to skip must be positive",
  );
});

Deno.test("SongQueue - Shuffle", () => {
  const queue = new SongQueue<string>();
  const songs = ["song1", "song2", "song3", "song4", "song5"];
  queue.addSongs([...songs]);

  // Save original order
  const originalOrder = queue.getQueue();

  // Shuffle
  queue.shuffle();
  const newOrder = queue.getQueue();

  // Current song should remain the same
  assertEquals(newOrder[0], originalOrder[0]);

  // Queue length should remain the same
  assertEquals(newOrder.length, originalOrder.length);

  // Order should be different (this could theoretically fail if shuffle happens to produce the same order)
  let isDifferent = false;
  for (let i = 1; i < newOrder.length; i++) {
    if (newOrder[i] !== originalOrder[i]) {
      isDifferent = true;
      break;
    }
  }
  assertEquals(isDifferent, true);
});

Deno.test("SongQueue - Shuffle Edge Cases", () => {
  // Empty queue
  const emptyQueue = new SongQueue<string>();
  emptyQueue.shuffle();
  assertEquals(emptyQueue.isEmpty(), true);

  // Queue with one song
  const singleSongQueue = new SongQueue<string>();
  singleSongQueue.addSongs(["song1"]);
  singleSongQueue.shuffle();
  assertEquals(singleSongQueue.getQueue(), ["song1"]);
});

Deno.test("SongQueue - Remove Song", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);

  // Remove middle song
  queue.removeSong(1);
  assertEquals(queue.getQueue(), ["song1", "song3"]);

  // Remove first song
  queue.removeSong(0);
  assertEquals(queue.getQueue(), ["song3"]);

  // Remove last song
  queue.removeSong(0);
  assertEquals(queue.isEmpty(), true);

  // Remove from empty queue
  assertThrows(
    () => queue.removeSong(0),
    Error,
    "Invalid index for queue removal",
  );

  // Remove with invalid index
  queue.addSongs(["song1"]);
  assertThrows(
    () => queue.removeSong(-1),
    Error,
    "Invalid index for queue removal",
  );

  assertThrows(
    () => queue.removeSong(100),
    Error,
    "Invalid index for queue removal",
  );
});

Deno.test("SongQueue - Is Empty", () => {
  const queue = new SongQueue<string>();
  assertEquals(queue.isEmpty(), true);

  queue.addSongs(["song1"]);
  assertEquals(queue.isEmpty(), false);

  queue.removeSong(0);
  assertEquals(queue.isEmpty(), true);
});

Deno.test("SongQueue - Clear", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2", "song3"]);

  queue.clear();
  // Your implementation keeps the first song
  assertEquals(queue.getQueue(), ["song1"]);
  assertEquals(queue.isEmpty(), false);

  // Clear empty queue
  const emptyQueue = new SongQueue<string>();
  emptyQueue.clear();
  assertEquals(emptyQueue.isEmpty(), true);
});

Deno.test("SongQueue - Set Loop Type", () => {
  const queue = new SongQueue<string>();

  // Default loop type
  assertEquals(queue.looping, "disabled");

  // Set to one
  const oneResult = queue.setLoopType("one");
  assertEquals(oneResult, "one");
  assertEquals(queue.looping, "one");

  // Set to all
  const allResult = queue.setLoopType("all");
  assertEquals(allResult, "all");
  assertEquals(queue.looping, "all");

  // Set to disabled
  const disabledResult = queue.setLoopType("disabled");
  assertEquals(disabledResult, "disabled");
  assertEquals(queue.looping, "disabled");
});

Deno.test("SongQueue - Get Queue", () => {
  const queue = new SongQueue<string>();
  queue.addSongs(["song1", "song2"]);

  // getQueue should return a copy
  const queueCopy = queue.getQueue();
  queueCopy.push("song3");

  // Original queue should be unchanged
  assertEquals(queue.getQueue(), ["song1", "song2"]);

  // Test with complex objects
  interface Song {
    title: string;
    artist: string;
  }

  const songQueue = new SongQueue<Song>();
  const song = { title: "Title", artist: "Artist" };
  songQueue.addSongs([song]);

  const songQueueCopy = songQueue.getQueue();
  songQueueCopy[0].title = "Modified";

  // This might fail if JSON.parse/stringify doesn't properly deep copy
  assertEquals(songQueue.currentSong()?.title, "Title");
});
