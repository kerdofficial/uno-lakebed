import { capsule } from "lakebed/server";
import { mutations } from "./mutations";
import { queries } from "./queries";
import { schema } from "./schema";

export default capsule({
  name: "uno",
  schema,
  queries,
  mutations,
  endpoints: {},
});
