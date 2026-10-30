package main

import (
	"database/sql"
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	// Registers the "sqlite" driver used by sql.Open
	_ "modernc.org/sqlite"
)

func main() {
	dbPath := flag.String("db", "../../sabrina.db", "Path to the SQLite database file")
	outDir := flag.String("out", "./export", "Output directory for CSV files")
	delim := flag.String("delim", ";", "CSV delimiter character")
	flag.Parse()

	if len(*delim) != 1 {
		log.Fatalf("Delimiter must be a single character, got %q", *delim)
	}
	delimiter := rune((*delim)[0])

	db, err := sql.Open("sqlite", *dbPath)
	if err != nil {
		log.Fatalf("Failed to open database %s: %v", *dbPath, err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	tables, err := discoverTables(db)
	if err != nil {
		log.Fatalf("Failed to discover tables: %v", err)
	}

	if len(tables) == 0 {
		log.Fatal("No tables found in database")
	}

	if err := os.MkdirAll(*outDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory %s: %v", *outDir, err)
	}

	fmt.Printf("Sabrina DB Export\n")
	fmt.Printf("─────────────────────────────────────────\n")
	fmt.Printf("Database : %s\n", *dbPath)
	fmt.Printf("Output   : %s\n", *outDir)
	fmt.Printf("Delimiter: %q\n", string(delimiter))
	fmt.Printf("Tables   : %d\n\n", len(tables))

	for _, table := range tables {
		outPath := filepath.Join(*outDir, table+".csv")
		rowCount, err := exportTable(db, table, outPath, delimiter)
		if err != nil {
			log.Printf("ERROR exporting %s: %v", table, err)
			continue
		}
		fmt.Printf("  ✓ %-30s %6d rows → %s\n", table, rowCount, outPath)
	}

	fmt.Printf("\nDone.\n")
}

// discoverTables returns the names of all user tables in the database.
func discoverTables(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tables = append(tables, name)
	}
	return tables, rows.Err()
}

// exportTable exports all rows from a single table to a CSV file.
// Returns the number of data rows written (excluding the header).
func exportTable(db *sql.DB, table, outPath string, delimiter rune) (int, error) {
	// Query all rows. Table names come from sqlite_master, not user input.
	rows, err := db.Query("SELECT * FROM " + table)
	if err != nil {
		return 0, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return 0, fmt.Errorf("failed to get columns: %w", err)
	}

	file, err := os.Create(outPath)
	if err != nil {
		return 0, fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Write UTF-8 BOM for Excel compatibility
	if _, err := file.Write([]byte{0xEF, 0xBB, 0xBF}); err != nil {
		return 0, fmt.Errorf("failed to write BOM: %w", err)
	}

	writer := csv.NewWriter(file)
	writer.Comma = delimiter
	defer writer.Flush()

	// Write header
	if err := writer.Write(columns); err != nil {
		return 0, fmt.Errorf("failed to write header: %w", err)
	}

	// Prepare scan destination — everything as nullable strings
	dest := make([]any, len(columns))
	destPtrs := make([]any, len(columns))
	for i := range dest {
		destPtrs[i] = &dest[i]
	}

	rowCount := 0
	for rows.Next() {
		if err := rows.Scan(destPtrs...); err != nil {
			return rowCount, fmt.Errorf("scan failed at row %d: %w", rowCount+1, err)
		}

		record := make([]string, len(columns))
		for i, val := range dest {
			if val == nil {
				record[i] = ""
			} else {
				record[i] = fmt.Sprintf("%v", val)
			}
		}

		if err := writer.Write(record); err != nil {
			return rowCount, fmt.Errorf("write failed at row %d: %w", rowCount+1, err)
		}
		rowCount++
	}

	if err := rows.Err(); err != nil {
		return rowCount, fmt.Errorf("row iteration error: %w", err)
	}

	writer.Flush()
	return rowCount, writer.Error()
}
