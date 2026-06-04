import { capsule } from "lakebed/server";
import { mutations } from "./mutations";
import { queries } from "./queries";
import { schema } from "./schema";

export default capsule({
  name: "UNO - Play with Friends!",
  schema,
  queries,
  mutations,
  endpoints: {},
});
