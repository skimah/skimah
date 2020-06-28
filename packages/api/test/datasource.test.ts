import { Datasource } from "../src/types";
import generate from "../src/generate";

describe("Schema Datasource", () => {
  const typeDefs = `
         type SpecialUser @datasource(name: "users") {
            userid: Int @unique
        }

        type Profile @datasource(name: "profiles") {
            id: ID @unique
        }

        type Post @datasource(name: "posts") {
            id: ID @unique
        }

        type NoneInit @datasource(name: "none") {
            id: ID @unique
        }
    `;

  const noop: Datasource = {
    select: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };

  const users = Object.assign({}, noop, { initialize: jest.fn() });
  const profiles = Object.assign({}, noop, { initialize: jest.fn() });
  const posts = Object.assign({}, noop, { initialize: jest.fn() });
  const none = Object.assign({}, noop);

  test("initialize sources", async () => {
    await generate({
      typeDefs,
      sources: {
        users,
        profiles,
        posts,
        none
      }
    });

    expect(users.initialize).toHaveBeenCalledTimes(1);
    expect(users.initialize.mock.calls[0][0][0].name).toMatchInlineSnapshot(
      `"SpecialUser"`
    );

    expect(profiles.initialize).toHaveBeenCalledTimes(1);
    expect(profiles.initialize.mock.calls[0][0][0].name).toMatchInlineSnapshot(
      `"Profile"`
    );

    expect(posts.initialize).toHaveBeenCalledTimes(1);
    expect(posts.initialize.mock.calls[0][0][0].name).toMatchInlineSnapshot(
      `"Post"`
    );
  });
});
