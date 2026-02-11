import snowflake from 'snowflake-sdk';

const connection = snowflake.createConnection({
  account: 'RRISPXQ-JUC46944',
  username: 'APP_SERVICE',
  password: 'jaldkDr72JDSDF1',
  role: 'ACCOUNTADMIN',
});

async function listResources() {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        console.error('Unable to connect:', err.message);
        reject(err);
        return;
      }

      console.log('✓ Successfully connected to Snowflake\n');

      // Get databases
      conn.execute({
        sqlText: 'SHOW DATABASES',
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Error fetching databases:', err.message);
            reject(err);
            return;
          }

          console.log('📊 AVAILABLE DATABASES:');
          console.log('========================');
          rows?.forEach((row: any) => {
            console.log(`  • ${row.name}`);
          });
          console.log('');

          // Get warehouses
          conn.execute({
            sqlText: 'SHOW WAREHOUSES',
            complete: (err, stmt, whRows) => {
              if (err) {
                console.error('Error fetching warehouses:', err.message);
                reject(err);
                return;
              }

              console.log('🏭 AVAILABLE WAREHOUSES:');
              console.log('========================');
              whRows?.forEach((row: any) => {
                console.log(`  • ${row.name} (size: ${row.size}, state: ${row.state})`);
              });
              console.log('');

              // Get schemas from a common database (if exists)
              const sampleDb = rows?.[0]?.name;
              if (sampleDb) {
                conn.execute({
                  sqlText: `SHOW SCHEMAS IN DATABASE ${sampleDb}`,
                  complete: (err, stmt, schRows) => {
                    if (err) {
                      console.log('Note: Could not list schemas');
                    } else {
                      console.log(`📁 AVAILABLE SCHEMAS (in ${sampleDb}):`);
                      console.log('========================');
                      schRows?.forEach((row: any) => {
                        console.log(`  • ${row.name}`);
                      });
                      console.log('');
                    }

                    connection.destroy((err) => {
                      if (err) console.error('Error closing connection:', err.message);
                      resolve(true);
                    });
                  },
                });
              } else {
                connection.destroy((err) => {
                  if (err) console.error('Error closing connection:', err.message);
                  resolve(true);
                });
              }
            },
          });
        },
      });
    });
  });
}

listResources()
  .then(() => {
    console.log('✓ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
