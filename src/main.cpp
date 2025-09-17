#include <Wt/WApplication.h>
#include <Wt/WBreak.h>
#include <Wt/WContainerWidget.h>
#include <Wt/WLineEdit.h>
#include <Wt/WPushButton.h>
#include <Wt/WText.h>
#include <Wt/WStackedWidget.h>
#include <Wt/WNavigationBar.h>
#include <Wt/WMenu.h>
#include <Wt/WPanel.h>
#include <Wt/WDialog.h>
#include <Wt/WFileUpload.h>
#include <Wt/WProgressBar.h>
#include <Wt/WComboBox.h>
#include <Wt/WSelectionBox.h>
#include <Wt/WCheckBox.h>
#include <Wt/WTable.h>
#include <Wt/WEnvironment.h>

#include "Database.h"
#include <iostream>
#include <vector>
#include <filesystem>
#include <random>

namespace fs = std::filesystem;

class MinecraftModHub : public Wt::WApplication {
private:
    Database db;
    Wt::WStackedWidget* mainStack;
    Wt::WText* userStatus;
    int currentUserId;
    std::string currentUsername;

    void createHomePage();
    void createLoginPage();
    void createRegisterPage();
    void createUploadPage();
    void createModsPage();
    void showModDetails(int mod_id);

    void handleLogin(const std::string& email, const std::string& password);
    void handleRegister(const std::string& username, const std::string& email, 
                       const std::string& password);
    void handleUpload(const std::string& name, const std::string& description,
                     const std::vector<std::string>& versions, const std::string& category,
                     const std::string& file_path);

public:
    MinecraftModHub(const Wt::WEnvironment& env);
};

MinecraftModHub::MinecraftModHub(const Wt::WEnvironment& env)
    : WApplication(env), db("minecraft_mods.db"), currentUserId(-1) {
    
    setTitle("Minecraft Mod Hub");
    useStyleSheet("style.css");

    // Initialize database
    if (!db.connect()) {
        std::cerr << "Failed to connect to database" << std::endl;
        quit();
        return;
    }

    // Create main layout
    auto container = root()->addWidget(std::make_unique<Wt::WContainerWidget>());
    container->setStyleClass("container");

    // Header
    auto header = container->addWidget(std::make_unique<Wt::WContainerWidget>());
    header->setStyleClass("header");

    auto logo = header->addWidget(std::make_unique<Wt::WContainerWidget>());
    logo->setStyleClass("logo");
    logo->addWidget(std::make_unique<Wt::WText>("Minecraft Mod Hub"));

    userStatus = header->addWidget(std::make_unique<Wt::WText>("Гость"));
    userStatus->setStyleClass("user-status");

    auto nav = header->addWidget(std::make_unique<Wt::WNavigationBar>());
    auto menu = nav->addMenu(std::make_unique<Wt::WMenu>());

    // Main content
    mainStack = container->addWidget(std::make_unique<Wt::WStackedWidget>());
    mainStack->setStyleClass("main-content");

    createHomePage();
    createLoginPage();
    createRegisterPage();
    createUploadPage();
    createModsPage();

    // Show home page initially
    mainStack->setCurrentIndex(0);
}

void MinecraftModHub::createHomePage() {
    auto homePage = std::make_unique<Wt::WContainerWidget>();
    homePage->addWidget(std::make_unique<Wt::WText>("<h1>Добро пожаловать в Minecraft Mod Hub!</h1>"));
    homePage->addWidget(std::make_unique<Wt::WText>(
        "<p>Загружайте, скачивайте и делитесь модами для Minecraft. "
        "Поддерживаются все версии от 1.7 до 1.21.8</p>"
    ));

    auto buttons = homePage->addWidget(std::make_unique<Wt::WContainerWidget>());
    buttons->setStyleClass("button-group");

    auto loginBtn = buttons->addWidget(std::make_unique<Wt::WPushButton>("Войти"));
    loginBtn->clicked().connect([this] { mainStack->setCurrentIndex(1); });

    auto registerBtn = buttons->addWidget(std::make_unique<Wt::WPushButton>("Регистрация"));
    registerBtn->clicked().connect([this] { mainStack->setCurrentIndex(2); });

    auto modsBtn = buttons->addWidget(std::make_unique<Wt::WPushButton>("Смотреть моды"));
    modsBtn->clicked().connect([this] { mainStack->setCurrentIndex(4); });

    mainStack->addWidget(std::move(homePage));
}

void MinecraftModHub::createLoginPage() {
    auto loginPage = std::make_unique<Wt::WContainerWidget>();
    loginPage->addWidget(std::make_unique<Wt::WText>("<h2>Вход в аккаунт</h2>"));

    auto form = loginPage->addWidget(std::make_unique<Wt::WContainerWidget>());
    form->setStyleClass("form");

    auto emailEdit = form->addWidget(std::make_unique<Wt::WLineEdit>());
    emailEdit->setPlaceholderText("Email");
    
    auto passwordEdit = form->addWidget(std::make_unique<Wt::WLineEdit>());
    passwordEdit->setPlaceholderText("Пароль");
    passwordEdit->setEchoMode(Wt::EchoMode::Password);

    auto loginBtn = form->addWidget(std::make_unique<Wt::WPushButton>("Войти"));
    loginBtn->clicked().connect([=] {
        handleLogin(emailEdit->text().toUTF8(), passwordEdit->text().toUTF8());
    });

    auto backBtn = form->addWidget(std::make_unique<Wt::WPushButton>("Назад"));
    backBtn->clicked().connect([this] { mainStack->setCurrentIndex(0); });

    mainStack->addWidget(std::move(loginPage));
}

void MinecraftModHub::handleLogin(const std::string& email, const std::string& password) {
    User user = db.getUserByEmail(email);
    if (user.id > 0) {
        // Simple password check (in real app, use hashing)
        if (user.password_hash == password) {
            currentUserId = user.id;
            currentUsername = user.username;
            userStatus->setText("Привет, " + user.username);
            mainStack->setCurrentIndex(0);
        }
    }
}

void MinecraftModHub::createModsPage() {
    auto modsPage = std::make_unique<Wt::WContainerWidget>();
    modsPage->addWidget(std::make_unique<Wt::WText>("<h2>Все моды</h2>"));

    auto mods = db.getAllMods();
    auto table = modsPage->addWidget(std::make_unique<Wt::WTable>());
    
    int row = 0;
    for (const auto& mod : mods) {
        table->elementAt(row, 0)->addWidget(std::make_unique<Wt::WText>(mod.name));
        table->elementAt(row, 1)->addWidget(std::make_unique<Wt::WText>(mod.category));
        table->elementAt(row, 2)->addWidget(std::make_unique<Wt::WText>(std::to_string(mod.rating)));
        
        auto downloadBtn = table->elementAt(row, 3)->addWidget(
            std::make_unique<Wt::WPushButton>("Скачать")
        );
        downloadBtn->clicked().connect([=] {
            db.incrementDownloads(mod.id);
        });
        
        row++;
    }

    mainStack->addWidget(std::move(modsPage));
}

int main(int argc, char** argv) {
    try {
        return Wt::WRun(argc, argv, [](const Wt::WEnvironment& env) {
            return std::make_unique<MinecraftModHub>(env);
        });
    } catch (const std::exception& e) {
        std::cerr << "Exception: " << e.what() << std::endl;
        return 1;
    }
}
