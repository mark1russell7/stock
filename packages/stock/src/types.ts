// The records of the stock. The core names no kind of item: the products, places and sources of a user are input data.

/** A calendar date in the form `YYYY-MM-DD`. */
export type IsoDate = string;

/** The `id` of a source, for example the page of a shelf-life table. */
export type SourceId = string;

/** The `id` of a place, for example a room or a shelf. */
export type PlaceId = string;

/**
 * The rule that gives the due date of a lot.
 * The rule `label` uses the date on the label. The rule `days` adds a count of days to the date of purchase, and cites its source.
 */
export type DueRule =
  | { readonly kind: "label" }
  | { readonly kind: "days"; readonly days: number; readonly source: SourceId };

/** What one unit of a product puts into a resource, and the due rule of the product. */
export interface ProductYield {
  readonly product: string;
  /** The resource that the product fills, for example `water.stored`. */
  readonly resource: string;
  /** The amount of the resource in one unit of the product, in the unit of the resource. */
  readonly perUnit: number;
  readonly due: DueRule;
}

/** A lot: an amount of one product at one place, with its dates. */
export interface Lot {
  readonly id: string;
  readonly product: string;
  readonly place: PlaceId;
  /** The count of units of the product. */
  readonly units: number;
  readonly bought: IsoDate;
  /** The due date. On this date and after it, the lot gives nothing. */
  readonly due: IsoDate;
  /** The price paid for the lot. */
  readonly price?: number;
}

/** The reason of a removal from the stock. */
export type RemoveReason = "due" | "lost" | "moved";

/**
 * An event of the stock log. The log is append-only. Each event has a unique `id`, so a merge of two copies of the log is a union.
 * The `at` field is an ISO 8601 time.
 */
export type StockEvent =
  | { readonly id: string; readonly kind: "add"; readonly at: string; readonly lot: Lot }
  | { readonly id: string; readonly kind: "use"; readonly at: string; readonly lot: string; readonly units: number }
  /** A correction after a count or a read of the label: the lot with the same `id` gets these fields. */
  | { readonly id: string; readonly kind: "correct"; readonly at: string; readonly lot: Lot }
  | { readonly id: string; readonly kind: "remove"; readonly at: string; readonly lot: string; readonly why: RemoveReason };

/** A task of the schedule. */
export interface Task {
  readonly id: string;
  readonly kind: "rotate" | "check" | "drill" | "review" | "buy";
  readonly due: IsoDate;
  /** The `id` of the record that makes the task: a lot, a device, a plan, a source or a purchase. */
  readonly ref: string;
  readonly title: string;
}
