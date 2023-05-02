// PART 1.
// Import the sqlForPartialUpdate function from the sql.js module
const { sqlForPartialUpdate } = require("./sql");

// Start test suite for the sqlForPartialUpdate function
describe("sqlForPartialUpdate", function () {

  // Test the function with data
  test("works with data", function () {
    // Call the sqlForPartialUpdate function with sample data
    const result = sqlForPartialUpdate(
      { firstName: "Douglas", age: 42 },
      { firstName: "first_name" }
    );
    // Expect the result to match a specific format
    expect(result).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ["Douglas", 42],
    });
  });

  // Test the function with no data - should throw an error
  test("throws error if no data", function () {
    // Call the sqlForPartialUpdate function with empty objects
    // expect error to be thrown with specific message
    expect(() => sqlForPartialUpdate({}, {})).toThrowError(
      "No data"
    );
  });
});
