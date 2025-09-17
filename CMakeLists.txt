cmake_minimum_required(VERSION 3.10)
project(MinecraftModHub)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Wt REQUIRED)
find_package(SQLite3 REQUIRED)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)

add_executable(minecraft_mod_hub
    src/main.cpp
    src/Auth.cpp
    src/Mod.cpp
    src/Database.cpp
)

target_link_libraries(minecraft_mod_hub
    PRIVATE Wt::Wt
    PRIVATE SQLite::SQLite3
)

install(TARGETS minecraft_mod_hub DESTINATION bin)
