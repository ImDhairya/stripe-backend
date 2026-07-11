import {DBConnection as _DBConnection} from "./db/";

declare global {
  type DbConnection = _DBConnection;
  type GlobalOptsTx = {
    tx: DbConnection;
  };
}
