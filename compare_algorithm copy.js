/*
Action Description,Action name,Input 1, Input 2, Input 3
Search for a book,search_book,title,author,null
Get the book's ISBN, get_book_isbn, book_title, book_author
Get the book's publisher,get_book_publisher,book_title, book_author
Writes a text output to the user,echo,message

Instruction: Search for the book "The Alchemist" by Paulo Coelho, retrieve its ISBN and publisher, and send a message to the user with the ISBN and publisher.

Step 1:
Thought: I need to search for the book "The Alchemist" by Paulo Coelho
Action: search_book
Action Input: "The Alchemist", "Paulo Coelho"
Output: {"Output": [{"title": "The Alchemist", "author": "Paulo Coelho", "ISBN": "123456789", "publisher": "HarperCollins"}]}


###


Step 2:
Thought: I need to get the book's ISBN
Action: get_book_isbn
Action Input: "123456789", "The Alchemist", "Paulo Coelho"

Step 3:
Thought: I need to get the book's publisher
Action: get_book_publisher
Action Input: "HarperCollins", "The Alchemist", "Paulo Coelho"

Step 4:
Thought: I need to echo "The book's ISBN is 123456789 and publisher is HarperCollins"
Action: echo
Action Input: "The book's ISBN is 123456789 and publisher is HarperCollins."
*/

const fs = require("fs");
const readLine = require("readline");

const inPutPath = "./input.txt";
const expectedPath = "./expected.txt";

const readInputFileGetStepsAndActionTable = (path) => {
  return new Promise((resolve, reject) => {
    let actionsTable = {};
    let steps = {};
    let startReadingActionTable = false;
    let startReadingSteps = false;
    let step = "";

    const readInputInterface = readLine.createInterface({
      input: fs.createReadStream(inPutPath),
    });

    readInputInterface.on("line", function (line) {
      //Save actions table in hash map
      if (line.startsWith("Instruction")) startReadingActionTable = false;
      if (startReadingActionTable) {
        if (line.length > 0) {
          let action = line.split(",");
          actionsTable[action[1].trim().toString()] = {
            description: action[0]?.trim(),
            input1: action[2]?.trim() ?? null,
            input2: action[3]?.trim() ?? null,
            input3: action[4]?.trim() ?? null,
          };
        }
      }
      if (line.startsWith("Action Description")) startReadingActionTable = true;

      //sav steps in hash map
      if (line.length === 0) startReadingSteps = false;
      if (line.startsWith("Step")) step = line.trim();

      if (startReadingSteps) {
        const values = line.split(":");
        steps[step] =
          values[0]?.trim() === "Output"
            ? { ...steps[step], [values[0].trim()]: values.join(" ") }
            : { ...steps[step], [values[0].trim()]: values[1].trim() };
      }

      if (line.startsWith("Step")) startReadingSteps = true;
    });

    readInputInterface.on("error", function (err) {
      console.error(err);
      reject(err);
    });

    readInputInterface.on("close", function () {
      resolve({ actionsTable, steps });
    });
  });
};

const readExpectedFileGetSteps = async (path) => {
  return new Promise((resolve, reject) => {
    let expectedSteps = {};
    let startReadingSteps = false;
    let step = "";

    const readExpectedInterface = readLine.createInterface({
      input: fs.createReadStream(expectedPath),
    });

    readExpectedInterface.on("line", function (line) {
      //sav steps in hash map
      if (line.length === 0) startReadingSteps = false;
      if (line.startsWith("Step")) step = line.trim();

      if (startReadingSteps) {
        const values = line.split(":");
        if (values && values.length > 0) {
          expectedSteps[step] = {
            ...expectedSteps[step],
            [values[0].trim()]: values[1].trim(),
          };
        }
      }

      if (line.startsWith("Step")) startReadingSteps = true;
    });

    readExpectedInterface.on("error", function (err) {
      console.error(err);
      reject(err);
    });

    readExpectedInterface.on("close", function () {
      resolve({ expectedSteps });
    });
  });
};

async function analyze() {
  const { actionsTable, steps } = await readInputFileGetStepsAndActionTable(
    inPutPath
  );
  const { expectedSteps } = await readExpectedFileGetSteps(expectedPath);
  // console.log(actionsTable, steps, expectedSteps);

  let actionMatchScore = 0;
  let thoughtMatchScore = 0;
  let actionInputMatchScore = 0;
  let total = 0;

  for (const step in steps) {
    const thought = steps[step]["Thought"];
    const action = steps[step]["Action"];
    const actionInput = steps[step]["Action Input"];

    const expectedThought = expectedSteps[step]
      ? expectedSteps[step]["Thought"]
      : null;
    const expectedAction = expectedSteps[step]
      ? expectedSteps[step]["Action"]
      : null;
    const expectedActionInput = expectedSteps[step]
      ? expectedSteps[step]["Action Input"]
      : null;

    if (
      action &&
      actionsTable.hasOwnProperty(action) &&
      expectedAction === action
    ) {
      actionMatchScore += 1;
    }
    
    if (thought && expectedThought) {
      thoughtMatchScore +=
        1- (levenshteinDistance(thought, expectedThought) / thought.length);
    }

    if (actionInput && expectedActionInput) {
      actionInputMatchScore +=
        1 -
        levenshteinDistance(actionInput, expectedActionInput) /
          actionInput.length;
    }

    total += 1;
  }

  return {
    actionMatchScore: (actionMatchScore / total) * 100,
    thoughtMatchScore: (thoughtMatchScore / total) * 100,
    actionInputMatchScore: (actionInputMatchScore / total) * 100,
  };
}

const levenshteinDistance = function (a, b) {
  if (a.length == 0) return b.length;
  if (b.length == 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1
          )
        ); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
};

analyze().then((result) => console.log(result));
