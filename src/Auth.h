#ifndef AUTH_H
#define AUTH_H

#include <string>
#include <Wt/Auth/AuthService.h>
#include <Wt/Auth/PasswordService.h>
#include <Wt/Auth/PasswordVerifier.h>
#include <Wt/Dbo/Session.h>
#include <Wt/Dbo/backend/Sqlite3.h>

class Auth {
private:
    Wt::Auth::AuthService authService;
    Wt::Auth::PasswordService passwordService;
    std::unique_ptr<Wt::Dbo::backend::Sqlite3> sqlite3;
    Wt::Dbo::Session session;

public:
    Auth();
    
    Wt::Auth::AuthService& getAuthService() { return authService; }
    Wt::Auth::PasswordService& getPasswordService() { return passwordService; }
    Wt::Dbo::Session& getSession() { return session; }
    
    void configureAuth();
};

#endif // AUTH_H
