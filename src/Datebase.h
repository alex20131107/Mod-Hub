#ifndef DATABASE_H
#define DATABASE_H

#include <sqlite3.h>
#include <string>
#include <vector>
#include <memory>

struct User {
    int id;
    std::string username;
    std::string email;
    std::string password_hash;
    std::string created_at;
};

struct Mod {
    int id;
    std::string name;
    std::string description;
    std::string category;
    std::string author;
    int author_id;
    double rating;
    int downloads;
    std::string created_at;
    std::string file_path;
    std::vector<std::string> versions;
};

class Database {
private:
    sqlite3* db;
    std::string db_path;

    bool execute(const std::string& sql);
    bool initialize();

public:
    Database(const std::string& path);
    ~Database();

    bool connect();
    void disconnect();

    // User operations
    bool createUser(const std::string& username, const std::string& email, 
                   const std::string& password_hash);
    User getUserByEmail(const std::string& email);
    User getUserById(int id);
    bool userExists(const std::string& email);

    // Mod operations
    bool createMod(const Mod& mod);
    std::vector<Mod> getAllMods();
    std::vector<Mod> getModsByCategory(const std::string& category);
    std::vector<Mod> searchMods(const std::string& query);
    Mod getModById(int id);
    bool incrementDownloads(int mod_id);
    bool updateModRating(int mod_id, double new_rating);

    // Version operations
    bool addModVersion(int mod_id, const std::string& version);
    std::vector<std::string> getModVersions(int mod_id);
};

#endif // DATABASE_H
