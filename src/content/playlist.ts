export interface Track {
  readonly title: string;
  readonly artist: string;
  readonly src: string;
  readonly duration: string;
}

export const playlist: readonly Track[] = [
  {
    title: "promises",
    artist: "kate",
    src: "/music/promises.mp3",
    duration: "4:07",
  },
  {
    title: "Arabesque No. 1",
    artist: "Claude Debussy, kate",
    src: "/music/arabesque.mp3",
    duration: "5:02",
  },
  {
    title: "offsets",
    artist: "kate",
    src: "/music/offset.mp3",
    duration: "3:58",
  },
  {
    title: "Intermezzo, Op. 118 No. 2",
    artist: "Johannes Brahms, kate",
    src: "/music/intermezzo.mp3",
    duration: "5:38",
  },
  {
    title: "Daydreaming",
    artist: "Radiohead, kate",
    src: "/music/daydreaming.mp3",
    duration: "2:19",
  },
  {
    title: "august",
    artist: "kate, with orchestra",
    src: "/music/august.mp3",
    duration: "5:58",
  },
  {
    title: "a lot can change in a year",
    artist: "Johannes Brahms, kate",
    src: "/music/alot.mp3",
    duration: "3:44",
  },
  {
    title: "Children's Corner, L. 113: I",
    artist: "Claude Debussy, kate",
    src: "/music/childrens_corner.mp3",
    duration: "2:38",
  },
];
