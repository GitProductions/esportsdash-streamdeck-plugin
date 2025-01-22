import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { IncrementScore } from "./actions/increment-counter";
import { DecrementScore } from "./actions/decrement-score";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action.
streamDeck.actions.registerAction(new IncrementScore());
streamDeck.actions.registerAction(new DecrementScore());


// Finally, connect to the Stream Deck.
streamDeck.connect();
