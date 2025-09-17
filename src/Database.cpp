#include "Database.h"
#include <iostream>
#include <sstream>

Database::Database(const std::string& path) : db_path(path), db(nullptr) {}

Database::~Database() {
    disconnect();
}

bool Database::connect() {
    if (sqlite3_open(db_path.c_str(), &db) != SQLITE_OK) {
        std::cerr << "Cannot open database: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    return initialize();
}

void Database::disconnect() {
    if (db) {
        sqlite3_close(db);
        db = nullptr;
    }
}

bool Database::execute(const std::string& sql) {
    char* errMsg = nullptr;
    if (sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &errMsg) != SQLITE_OK) {
        std::cerr << "SQL error: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    return true;
}

bool Database::initialize() {
    std::string sql = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            author TEXT NOT NULL,
            author_id INTEGER NOT NULL,
            rating REAL DEFAULT 0.0,
            downloads INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            file_path TEXT NOT NULL,
            FOREIGN KEY (author_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS mod_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mod_id INTEGER NOT NULL,
            version TEXT NOT NULL,
            FOREIGN KEY (mod_id) REFERENCES mods (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    )";

    return execute(sql);
}

bool Database::createUser(const std::string& username, const std::string& email, 
                         const std::string& password_hash) {
    std::string sql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_text(stmt, 1, username.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, email.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, password_hash.c_str(), -1, SQLITE_STATIC);

    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    
    return result;
}

User Database::getUserByEmail(const std::string& email) {
    User user;
    std::string sql = "SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return user;
    }

    sqlite3_bind_text(stmt, 1, email.c_str(), -1, SQLITE_STATIC);

    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user.id = sqlite3_column_int(stmt, 0);
        user.username = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        user.email = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        user.password_hash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        user.created_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
    }

    sqlite3_finalize(stmt);
    return user;
}

bool Database::createMod(const Mod& mod) {
    std::string sql = R"(
        INSERT INTO mods (name, description, category, author, author_id, file_path)
        VALUES (?, ?, ?, ?, ?, ?)
    )";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_text(stmt, 1, mod.name.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, mod.description.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, mod.category.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 4, mod.author.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int(stmt, 5, mod.author_id);
    sqlite3_bind_text(stmt, 6, mod.file_path.c_str(), -1, SQLITE_STATIC);

    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    int mod_id = sqlite3_last_insert_rowid(db);
    sqlite3_finalize(stmt);

    // Add versions
    if (result) {
        for (const auto& version : mod.versions) {
            addModVersion(mod_id, version);
        }
    }

    return result;
}

std::vector<Mod> Database::getAllMods() {
    std::vector<Mod> mods;
    std::string sql = "SELECT id, name, description, category, author, author_id, rating, downloads, created_at, file_path FROM mods ORDER BY created_at DESC";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return mods;
    }

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        Mod mod;
        mod.id = sqlite3_column_int(stmt, 0);
        mod.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        mod.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        mod.category = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        mod.author = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        mod.author_id = sqlite3_column_int(stmt, 5);
        mod.rating = sqlite3_column_double(stmt, 6);
        mod.downloads = sqlite3_column_int(stmt, 7);
        mod.created_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
        mod.file_path = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));
        
        mod.versions = getModVersions(mod.id);
        mods.push_back(mod);
    }

    sqlite3_finalize(stmt);
    return mods;
}

bool Database::addModVersion(int mod_id, const std::string& version) {
    std::string sql = "INSERT INTO mod_versions (mod_id, version) VALUES (?, ?)";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_int(stmt, 1, mod_id);
    sqlite3_bind_text(stmt, 2, version.c_str(), -1, SQLITE_STATIC);

    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    
    return result;
}

std::vector<std::string> Database::getModVersions(int mod_id) {
    std::vector<std::string> versions;
    std::string sql = "SELECT version FROM mod_versions WHERE mod_id = ?";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) {
        return versions;
    }

    sqlite3_bind_int(stmt, 1, mod_id);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        versions.push_back(reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0)));
    }

    sqlite3_finalize(stmt);
    return versions;
}
