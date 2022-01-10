#pragma once

#include <csl/wf.hpp>

namespace test::wf::repeat_ {

    // invoke_n_times
    consteval void invoke_n_times() {
        constexpr auto result = [](){
            std::array<int, 3> value;
            csl::wf::invoke_n_times<3>(
                [&, index = 0]() mutable { value[index] = index; index++; }
            );
            return value;
        }();
        static_assert(result == std::array{0,1,2});
    }
    consteval void invoke_n_times_with_return_value() {
        constexpr auto result = csl::wf::invoke_n_times<3>([i = 0]() constexpr mutable { return ++i; });
        static_assert(result == std::array{1,2,3});
    }

    // repeater
    consteval void repeater_() {
        constexpr auto result = [](){
            std::array<int, 3> value;
            auto func = [&, index = 0]() mutable { value[index] = index; index++; };
            csl::wf::repeater<3, decltype(func)>{ std::move(func) }();
            return value;
        }();
        static_assert(result == std::array{0,1,2});
    }
    consteval void repeater_with_return_value() {
        constexpr auto func = [i = 0]() constexpr mutable { return ++i; };
        using repeater_type = csl::wf::repeater<3, std::remove_cvref_t<decltype(func)>>;
        constexpr auto result = repeater_type{ func }();
        static_assert(result == std::array{1,2,3});
    }

    // repeater_factory
    consteval void repeater_factory_() {
        constexpr auto result = [](){
            std::array<int, 3> value;
            auto func = [&, index = 0]() mutable { value[index] = index; index++; };
            csl::wf::repeater_factory<3>::make(std::move(func))();
            return value;
        }();
        static_assert(result == std::array{0,1,2});
    }
    consteval void repeater_factory_with_return_value() {
        constexpr auto func = [i = 0]() constexpr mutable { return ++i; };
        constexpr auto result = csl::wf::repeater_factory<3>::make(std::move(func))();
        static_assert(result == std::array{1,2,3});
    }

    // make_repetition
    consteval void make_repetition() {
        constexpr auto result = [](){
            std::array<int, 3> value;
            csl::wf::make_repetition<3>(
                [&, index = 0]() mutable { value[index] = index; index++; }
            )();
            return value;
        }();
        static_assert(result == std::array{0,1,2});
    }
    consteval void make_repetition_with_return_value() {
        constexpr auto result = csl::wf::make_repetition<3>([i = 0]() constexpr mutable { return ++i; })();
        static_assert(result == std::array{1,2,3});
    }
}