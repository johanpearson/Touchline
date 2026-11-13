/** A club. Plain JSON-serialisable data; players are referenced by id. */
export type Club = {
  id: string;
  name: string;
  shortName: string;
  colours: { primary: string; secondary: string };
  playerIds: string[];
};
