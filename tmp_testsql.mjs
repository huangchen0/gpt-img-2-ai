import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL,{max:1, idle_timeout:5});
const run=async()=>{
  try {
    const rows = await sql`
      select sum("remaining_credits") as total
      from "credit"
      where (
        "credit"."user_id" = ${process.env.USER_ID}
        and "credit"."transaction_type" = 'grant'
        and "credit"."status" = 'active'
        and "credit"."remaining_credits" > 0
        and ("credit"."expires_at" is null or "credit"."expires_at" > ${process.env.NOW})
      )
    `;
    console.log(rows);
  } catch(e) {
    console.error('err', e);
  } finally {
    await sql.end({timeout:1});
  }
};
run();
