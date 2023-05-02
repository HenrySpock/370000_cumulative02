"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: returns all companies", async function () {
    const res = await Company.findAll({});  
    expect(res).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1", 
        logo_url: "http://c1.img", 
        num_employees: 1
      },
      {
        handle: "c2",
        name: "C2",
        description: "Desc2", 
        logo_url: "http://c2.img", 
        num_employees: 2
      },
      {
        handle: "c3",
        name: "C3",
        description: "Desc3", 
        logo_url: "http://c3.img", 
        num_employees: 3
      },
    ]);
  }); 
  test("works: filters by name", async function () {
    const res = await Company.findAll({ name: "c1" });
    expect(res).toEqual([
      {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        num_employees: 1,
        logo_url: "http://c1.img",
      },
    ]);
  });   
  test("works: returns companies filtered by minEmployees", async function () {
    const res = await Company.findAll({ minEmployees: 2 }); 
    expect(res).toHaveLength(2);
    expect(res[0]).toHaveProperty("handle", "c2");
    expect(res[1]).toHaveProperty("handle", "c3");
  });

  test("works: returns companies filtered by maxEmployees", async function () {
    const res = await Company.findAll({ maxEmployees: 2 });
    expect(res).toHaveLength(2);
    expect(res[0]).toHaveProperty("handle", "c1");
    expect(res[1]).toHaveProperty("handle", "c2");
  });

  test("works: returns companies filtered by name and minEmployees", async function () {
    const res = await await Company.findAll({ name: "c2", minEmployees: 2 });
    expect(res).toHaveLength(1);
    expect(res[0]).toHaveProperty("handle", "c2"); 
  });

  test("works: returns companies filtered by name and maxEmployees", async function () {
    const res = await await Company.findAll({ name: "c3", maxEmployees: 3 });
    expect(res).toHaveLength(1);
    expect(res[0]).toHaveProperty("handle", "c3");  
  });

  test("works: returns companies filtered by minEmployees and maxEmployees", async function () {
    const res = await await Company.findAll({ minEmployees: 2 , maxEmployees: 3 });
    expect(res).toHaveLength(2);
    expect(res[0]).toHaveProperty("handle", "c2");
    expect(res[1]).toHaveProperty("handle", "c3");
  });
 
  test("works: name, minEmployees, and maxEmployees", async function () {
    const res = await await Company.findAll({ name: "c2", minEmployees: 2 , maxEmployees: 3 });  
    expect(res).toEqual(
      [
        {
          handle: "c2",
          name: "C2",
          description: "Desc2",
          num_employees: 2,
          logo_url: "http://c2.img",
        }
      ]
    ); 
  }); 

  test("not found if no such company", async function () {
    expect.assertions(1);
    try {
      const res = await Company.findAll({ name: "nope" });
    } catch (err) { 
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) { 
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {}); 
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Company.remove("c1");
    const res = await db.query(
        "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
