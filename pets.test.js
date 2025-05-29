const request = require("supertest");
const app = require("./server");

describe("Pets API", () => {
  test("GET /pets should return all pets", async () => {
    const res = await request(app).get("/pets");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0); 
  });

  test("POST /pets should add a new pet", async () => {
    const newPet = {
      name: "TestPet",
      species: "Cat",
      age: 2,
      status: "Available",
      image: "https://example.com/test.jpg"
    };
  
    const res = await request(app).post("/pets").send(newPet);
  
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("TestPet");
    expect(res.body.species).toBe("Cat");
  });

  test("PATCH /pets/:id should update an existing pet", async () => {
    const newPet = {
      name: "EditMe",
      species: "Dog",
      age: 4,
      status: "Available",
      image: "https://example.com/edit.jpg"
    };
  
    const postRes = await request(app).post("/pets").send(newPet);
    const petId = postRes.body.id;
  
    const patchRes = await request(app).patch(`/pets/${petId}`).send({
      status: "Adopted"
    });
  
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.status).toBe("Adopted");
  });

  test("DELETE /pets/:id should delete an existing pet", async () => {
    const newPet = {
      name: "DeleteMe",
      species: "Dog",
      age: 5,
      status: "Available",
      image: "https://example.com/delete.jpg"
    };
  
    const postRes = await request(app).post("/pets").send(newPet);
    const petId = postRes.body.id;
  
    const deleteRes = await request(app).delete(`/pets/${petId}`);
  
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body).toHaveProperty("message", "Pet deleted");
    expect(deleteRes.body.pet.id).toBe(petId);
  });

  test("GET /pets?status=Available should return only available pets", async () => {
    await request(app).post("/pets").send({
      name: "AvailablePet",
      species: "Cat",
      age: 2,
      status: "Available",
      image: "https://example.com/available.jpg"
    });
  
    await request(app).post("/pets").send({
      name: "AdoptedPet",
      species: "Dog",
      age: 3,
      status: "Adopted",
      image: "https://example.com/adopted.jpg"
    });
  
    const res = await request(app).get("/pets?status=Available");
  
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every(p => p.status === "Available")).toBe(true);
  });

  test("GET /pets?sort=age should return pets sorted by age (asc)", async () => {
    await request(app).post("/pets").send({
      name: "OlderPet",
      species: "Dog",
      age: 10,
      status: "Available",
      image: "https://example.com/old.jpg"
    });
  
    await request(app).post("/pets").send({
      name: "YoungerPet",
      species: "Cat",
      age: 1,
      status: "Available",
      image: "https://example.com/young.jpg"
    });
  
    const res = await request(app).get("/pets?sort=age");
  
    expect(res.statusCode).toBe(200);
    expect(res.body[0].age).toBeLessThanOrEqual(res.body[1].age);
  });

  test("POST /pets should return 400 for invalid data", async () => {
    const res = await request(app).post("/pets").send({
      name: 123, // invalid
      species: "Dog",
      age: "young", // invalid
      status: "Available",
      image: null // invalid
    });
  
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("PATCH /pets/:id should return 404 if pet not found", async () => {
    const res = await request(app).patch("/pets/99999").send({
      name: "GhostPet"
    });
  
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error", "Pet not found");
  });

  test("DELETE /pets/:id should return 404 if pet not found", async () => {
    const res = await request(app).delete("/pets/99999");
  
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error", "Pet not found");
  });
  
  test("PATCH /pets/:id should return 400 for invalid field", async () => {
    const newPet = {
      name: "InvalidEdit",
      species: "Dog",
      age: 2,
      status: "Available",
      image: "https://example.com/edit.jpg"
    };
  
    const postRes = await request(app).post("/pets").send(newPet);
    const petId = postRes.body.id;
  
    const res = await request(app).patch(`/pets/${petId}`).send({
      age: "not-a-number" // invalid
    });
  
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
  
  test("GET /pets?sort=name should return pets sorted by name", async () => {
    await request(app).post("/pets").send({
      name: "Zara",
      species: "Cat",
      age: 1,
      status: "Available",
      image: "https://example.com/zara.jpg"
    });
  
    await request(app).post("/pets").send({
      name: "Andy",
      species: "Dog",
      age: 2,
      status: "Available",
      image: "https://example.com/andy.jpg"
    });
  
    const res = await request(app).get("/pets?sort=name");
  
    expect(res.statusCode).toBe(200);
    const names = res.body.map(p => p.name);
    expect(names).toEqual([...names].sort()); 
  });
  
  test("PATCH /pets/:id should return 400 if name is not string", async () => {
    const pet = await request(app).post("/pets").send({
      name: "Stringy",
      species: "Dog",
      age: 3,
      status: "Available",
      image: "img.jpg"
    });
  
    const res = await request(app).patch(`/pets/${pet.body.id}`).send({
      name: 999 // invalid name
    });
  
    expect(res.statusCode).toBe(400);
  });

  test("PATCH /pets/:id should return 400 if species is not string", async () => {
    const res = await request(app).post("/pets").send({
      name: "PatchSpecie",
      species: "Dog",
      age: 2,
      status: "Available",
      image: "img"
    });
  
    const patch = await request(app).patch(`/pets/${res.body.id}`).send({
      species: 123 // invalid
    });
  
    expect(patch.statusCode).toBe(400);
  });

  test("PATCH /pets/:id should return 400 if status is not string", async () => {
    const res = await request(app).post("/pets").send({
      name: "PatchStatus",
      species: "Cat",
      age: 2,
      status: "Available",
      image: "img"
    });
  
    const patch = await request(app).patch(`/pets/${res.body.id}`).send({
      status: 42
    });
  
    expect(patch.statusCode).toBe(400);
  });

  test("GET /pets?name=lu should return pets with name including 'lu'", async () => {
    await request(app).post("/pets").send({
      name: "Luna",
      species: "Cat",
      age: 2,
      status: "Available",
      image: "img"
    });
  
    const res = await request(app).get("/pets?name=lu");
  
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name.toLowerCase()).toContain("lu");
  });
  
  test("GET /pets?age=2 should return pets aged 2", async () => {
    await request(app).post("/pets").send({
      name: "AgeTest",
      species: "Cat",
      age: 2,
      status: "Available",
      image: "img"
    });
  
    const res = await request(app).get("/pets?age=2");
    expect(res.statusCode).toBe(200);
    expect(res.body.every(p => p.age === 2)).toBe(true);
  });

  test("GET /pets?age=not-a-number should not crash and return all pets", async () => {
    const res = await request(app).get("/pets?age=not-a-number");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("PATCH /pets/:id should return 400 for invalid species (not Dog/Cat)", async () => {
    const res = await request(app).post("/pets").send({
      name: "PatchSpeciesTest",
      species: "Dog",
      age: 2,
      status: "Available",
      image: "img"
    });
  
    const patch = await request(app).patch(`/pets/${res.body.id}`).send({
      species: "Horse"
    });
  
    expect(patch.statusCode).toBe(400);
  });

  test("PATCH /pets/:id should return 400 for invalid age (out of range)", async () => {
    const res = await request(app).post("/pets").send({
      name: "PatchAgeTest",
      species: "Cat",
      age: 2,
      status: "Available",
      image: "img"
    });
  
    const patch = await request(app).patch(`/pets/${res.body.id}`).send({
      age: 99
    });
  
    expect(patch.statusCode).toBe(400);
  });

  test("PATCH /pets/:id should apply multiple valid updates", async () => {
    const res = await request(app).post("/pets").send({
      name: "PatchMe",
      species: "Dog",
      age: 4,
      status: "Available",
      image: "img"
    });
  
    const patch = await request(app).patch(`/pets/${res.body.id}`).send({
      name: "PatchedName",
      status: "Adopted"
    });
  
    expect(patch.statusCode).toBe(200);
    expect(patch.body.name).toBe("PatchedName");
    expect(patch.body.status).toBe("Adopted");
  });

  
  test("PATCH /pets/:id should update all fields correctly", async () => {
    const res = await request(app).post("/pets").send({
      name: "AllFields",
      species: "Dog",
      age: 5,
      status: "Available",
      image: "img"
    });
  
    const patch = await request(app).patch(`/pets/${res.body.id}`).send({
      name: "UpdatedName",
      species: "Cat",
      age: 6,
      status: "Adopted",
      image: "new-img"
    });
  
    expect(patch.statusCode).toBe(200);
    expect(patch.body.name).toBe("UpdatedName");
    expect(patch.body.species).toBe("Cat");
    expect(patch.body.age).toBe(6);
    expect(patch.body.status).toBe("Adopted");
    expect(patch.body.image).toBe("new-img");
  });

  
  
});

