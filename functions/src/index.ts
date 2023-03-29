import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";

async function fetchResults(id: string): Promise<any> {
  const apiKey = process.env.BRIGHT_DATA_APIKEY;

  const response = await fetch(
    `https://api.brightdata.com/dca/dataset?id=${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = await response.json();

  if (data.status === "building" || data.status === "collecting") {
    console.log("NOT COMPLETE YET, TRYING AGAIN...");
    return fetchResults(id);
  }

  return data;
}

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    console.log("SCRAPE COMPLETE >>>", request.body);

    const { success, id, finished } = request.body;

    if (!success) {
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          updatedAt: finished,
        },
        {
          merge: true,
        }
      );
    }

    const data = await fetchResults(id);

    await adminDb.collection("searches").doc(id).set({
      status: "complete",
      updatedAt: finished,
      results: data,
    }, {
      merge: true
    });

    response.send("Scraping Function Finished");
  }
);
