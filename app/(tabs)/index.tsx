import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const menu = require("../../assets/menu.png");

export default function Index() {
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("Zenica");
  const [newCity, setNewCity] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const key = "6c946d2d44e84098b50154447250211";

  const getBackgroundColor = () => {
    const h = new Date().getHours();
    if (h >= 11 && h <= 13) return "bg-sky-300";
    if (h >= 20 || h <= 5) return "bg-blue-900";
    if (h > 13 && h < 20) return "bg-sky-500";
    return "bg-sky-400";
  };

  const bgColorClass = useMemo(getBackgroundColor, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("cities");
        if (stored) setCities(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading cities:", e);
      }
    })();
  }, []);

  async function getData(city: string) {
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${city}&days=7&aqi=yes&alerts=yes&nocache=${Date.now()}`,
      );
      if (!response.ok) throw new Error(`Response status: ${response.status}`);
      const result = await response.json();
      setWeather(result);
      console.log(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  useEffect(() => {
    getData(selectedCity);
    const interval = setInterval(() => getData(selectedCity), 1000 * 30);
    return () => clearInterval(interval);
  }, [selectedCity]);

  const toggleMenu = () => {
    Animated.timing(slideAnim, {
      toValue: menuOpen ? -300 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setMenuOpen(!menuOpen);
  };

  const addCity = async () => {
    if (!newCity.trim()) return;
    const updated = [...new Set([...cities, newCity.trim()])];
    setCities(updated);
    await AsyncStorage.setItem("cities", JSON.stringify(updated));
    setNewCity("");
  };

  const removeCity = async (city: string) => {
    const updated = cities.filter((c) => c !== city);
    setCities(updated);
    await AsyncStorage.setItem("cities", JSON.stringify(updated));
  };

  const hourlyNext24 = useMemo(() => {
    if (!weather?.forecast?.forecastday) return [];
    const now = Math.floor(Date.now() / 1000);
    const hours: any[] = [];
    for (const d of weather.forecast.forecastday)
      if (Array.isArray(d.hour)) hours.push(...d.hour);
    hours.sort((a, b) => a.time_epoch - b.time_epoch);
    const future = hours.filter((h) => h.time_epoch >= now).slice(0, 24);
    return future.length ? future : hours.slice(0, 24);
  }, [weather]);

  return (
    <>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: slideAnim,
          width: 300,
          height: "100%",
          backgroundColor: "#1E293B",
          zIndex: 10,
          paddingTop: 60,
          paddingHorizontal: 16,
        }}
      >
        <Text className="mb-4 text-xl font-semibold text-white">
          🌆 Your Cities
        </Text>

        <View className="flex-row mb-4">
          <TextInput
            placeholder="Add city..."
            placeholderTextColor="#ccc"
            value={newCity}
            onChangeText={setNewCity}
            className="flex-1 px-3 py-2 text-white rounded-md bg-white/10"
          />
          <TouchableOpacity
            onPress={addCity}
            className="px-3 py-2 ml-2 rounded-md bg-sky-500"
          >
            <Text className="font-semibold text-white">Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {cities.length === 0 && (
            <Text className="mb-2 text-sm text-gray-400">
              No cities added yet
            </Text>
          )}
          {cities.map((city) => (
            <View
              key={city}
              className="flex-row items-center justify-between py-2 border-b border-gray-600"
            >
              <TouchableOpacity
                onPress={() => {
                  setSelectedCity(city);
                  toggleMenu();
                }}
              >
                <Text
                  className={`text-white text-lg ${
                    selectedCity === city ? "font-bold text-sky-400" : ""
                  }`}
                >
                  {city}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeCity(city)}>
                <Text className="text-lg text-red-400">✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      <ScrollView className="flex-1 bg-white">
        <View
          className={`relative flex-1 w-full ${bgColorClass} h-[600px] items-center justify-center`}
        >
          <View className="absolute flex-row items-center w-full m-2 top-10 left-6">
            <TouchableOpacity onPress={toggleMenu}>
              <Image source={menu} className="w-12 h-12" />
            </TouchableOpacity>
            <Text className="ml-5 text-2xl text-white">
              {weather?.location?.name ?? selectedCity}
            </Text>
          </View>
          {weather && (
            <Text className="text-white text-8xl">
              {weather.current.temp_c}°C
            </Text>
          )}
        </View>

        <ScrollView horizontal className={`h-[100px] ${bgColorClass} px-2`}>
          {hourlyNext24.map((h: any) => {
            const cond = (h?.condition?.text || "").toLowerCase();
            let icon = "☀️";
            if (
              cond.includes("rain") ||
              cond.includes("drizzle") ||
              cond.includes("shower") ||
              cond.includes("thund")
            )
              icon = "🌧️";
            else if (
              cond.includes("snow") ||
              cond.includes("sleet") ||
              cond.includes("ice")
            )
              icon = "❄️";
            else if (cond.includes("cloud")) icon = "⛅️";

            const hour = new Date(h.time).getHours();
            const displayHour = hour % 12 === 0 ? 12 : hour % 12;
            const ampm = hour >= 12 ? "PM" : "AM";

            return (
              <View
                key={h.time_epoch}
                className="items-center justify-center w-20 h-full m-2 rounded-lg bg-white/20"
              >
                <Text className="text-sm text-white">{`${displayHour} ${ampm}`}</Text>
                <Text className="mt-1 text-2xl">{icon}</Text>
                <Text className="mt-1 text-sm text-white">
                  {Math.round(h.temp_c)}°
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View className={`flex-1 p-4 ${bgColorClass}`}>
          <Text className="mb-2 text-lg font-semibold text-white">
            3-day forecast
          </Text>
          <ScrollView
            className="w-full"
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {weather?.forecast?.forecastday?.slice(0, 7).map((day: any) => {
              const date = new Date(day.date);
              const weekday = date.toLocaleDateString(undefined, {
                weekday: "short",
              });
              const cond = (day?.day?.condition?.text || "").toLowerCase();
              let icon = "☀️";
              if (
                cond.includes("rain") ||
                cond.includes("drizzle") ||
                cond.includes("shower") ||
                cond.includes("thund")
              )
                icon = "🌧️";
              else if (
                cond.includes("snow") ||
                cond.includes("sleet") ||
                cond.includes("ice")
              )
                icon = "❄️";
              else if (cond.includes("cloud")) icon = "⛅️";

              return (
                <View
                  key={day.date}
                  className="flex-row items-center justify-between w-full p-3 mb-3 rounded-lg bg-white/20"
                >
                  <View>
                    <Text className="font-medium text-white">{weekday}</Text>
                    <Text className="text-sm text-white opacity-90">
                      {day.date}
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl">{icon}</Text>
                    <Text className="mt-1 text-sm text-white">
                      {Math.round(day.day.mintemp_c)}° /{" "}
                      {Math.round(day.day.maxtemp_c)}°
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
        <View className={`w-full py-3 ${bgColorClass}`}>
          <View className="flex-row items-center justify-around w-full">
            <View className="items-center justify-center w-1/2 h-40 rounded-lg bg-slate-300/85">
              <Text className="text-2xl text-white">💨 Wind</Text>
              <Text className="mt-1 text-2xl font-semibold text-white">
                {weather?.current?.wind_kph
                  ? `${Math.round(weather.current.wind_kph)} kph`
                  : weather?.current?.wind_mph
                    ? `${Math.round(weather.current.wind_mph)} mph`
                    : "—"}
              </Text>
              <Text className="mt-1 text-xl text-white">
                {weather?.current?.wind_dir ?? ""}
              </Text>
            </View>

            <View className="items-center justify-center w-1/2 h-40 mx-2 rounded-lg bg-slate-300/85">
              <Text className="text-2xl text-white">🌧️ Rain</Text>
              <Text className="mt-1 text-2xl font-semibold text-white">
                {weather?.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain
                  ? `${weather.forecast.forecastday[0].day.daily_chance_of_rain}%`
                  : weather?.current?.precip_mm
                    ? `${weather.current.precip_mm} mm`
                    : "No rain"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
