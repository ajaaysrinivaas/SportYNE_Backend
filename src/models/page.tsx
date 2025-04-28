"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Topic, SubTopic, Post } from "../../models/topics";
import { TopicService } from "@/services/topicService";
import { ConfigStore } from "@/models/config";
import { CacheItem, CacheService } from "@/services/cacheService";
import Link from "next/link";

export default function AnatomyPage() {
  const [subtopics, setSubtopics] = useState<SubTopic[]>([]); // Subfolders under "Anatomy"
  const [selectedSubtopic, setSelectedSubtopic] = useState<SubTopic | null>(null); // Tracks the clicked subtopic
  const [latestPosts, setLatestPosts] = useState<Post[]>([]); // Recent files across all subtopics
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  const router = useRouter();  

  const fetchFreshData = useCallback(async () => {
    try {
      const config = new ConfigStore();
      console.log("BACKEND_URL:", config.BACKEND_URL);

      console.log("inside fetchFreshData:", config.BACKEND_URL);

      const topicService = new TopicService(config);
      const anatomyTopic = await topicService.GetTopic("anatomy");
      if (anatomyTopic) {
        const subTopics = anatomyTopic.subTopics;
        const latestPosts = subTopics
          .flatMap((subTopic) => subTopic.posts || [])
          .slice(0, 5);

        setSubtopics(anatomyTopic.subTopics);
        setLatestPosts(latestPosts);

        const cacheService = new CacheService("anatomy");
        const cacheItem: CacheItem = {
          subTopics: anatomyTopic.subTopics,
          latestPosts: latestPosts,
        };
        cacheService.Store(cacheItem);
      } else {
        console.warn("Anatomy folder not found in API response.");
        setSubtopics([]);
        setLatestPosts([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    const cacheService = new CacheService("anatomy");
    const cachedData = cacheService.Retrieve<CacheItem>();
    const cacheTimestamp = cacheService.RetrieveTimestamp();

    // Validate cache
    if (cachedData && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
      const subTopics = cachedData.subTopics;
      const latestPosts = cachedData.latestPosts;

      // Check if cached data is valid for Anatomy
      if (subTopics.every(sub => sub.name.includes("Anatomy"))) {
        console.log("Using fresh cached data for Anatomy.");
        setSubtopics(subtopics);
        setLatestPosts(latestPosts);
        setLoading(false);
        return;
      } else {
        console.warn("Cached data invalid. Clearing cache...");
        cacheService.Remove();
      }
    }

    // Fetch fresh data if cache is not valid
    fetchFreshData();
  }, [CACHE_DURATION, fetchFreshData]);

  const handleSubtopicClick = (subtopic: SubTopic) => {
    setSelectedSubtopic(subtopic); // Set the clicked subtopic
  };

  const closeSubtopic = () => {
    setSelectedSubtopic(null); // Close the popup/subpage
  };

  const handleFileClick = (fileId: string) => {
    // Navigate to the new file content page with the file ID
    router.prefetch(`/anatomy/file/${fileId}`);
    router.push(`/anatomy/file/${fileId}`);
  };

  return (
    <div className="max-w-7xl mx-auto py-16 px-6">
      {/* Breadcrumb Navigation */}
      <nav className="mb-4 text-gray-600 text-sm">
        <ul className="flex space-x-2">
          <li>
            <Link href="/" className="hover:underline text-blue-500">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <span className="text-gray-800">Anatomy</span>
          </li>
        </ul>
      </nav>

      {/* Header Section */}
      <section className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">Anatomy</h1>
        <p className="text-xl text-gray-600 italic">
          Dive into the complexities of the human body, from systems to structures.
        </p>
      </section>

      {/* Explore Subtopics Section */}
      <section id="subtopics" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Explore Subtopics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && <p>Loading subtopics...</p>}
          {!loading &&
            subtopics.map((subtopic) => (
              <div
                key={subtopic.id}
                className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition cursor-pointer"
                onClick={() => handleSubtopicClick(subtopic)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {subtopic.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {subtopic.posts.length} posts available
                </p>
              </div>
            ))}
          {!loading && subtopics.length === 0 && <p>No subtopics available.</p>}
        </div>
      </section>

      {/* Selected Subtopic Files Section */}
      {selectedSubtopic && (
        <section className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl w-full">
            <button
              className="text-gray-500 hover:text-gray-800 font-bold mb-4"
              onClick={closeSubtopic}
            >
              Close
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Files in {selectedSubtopic.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {selectedSubtopic.posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition duration-200"
                  onClick={() => handleFileClick(post.id)}
                >
                  <h3 className="text-lg font-semibold text-gray-800">{post.name}</h3>
                </div>
              ))}
              {selectedSubtopic.posts.length === 0 && (
                <p>No files available in this subtopic.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Latest Posts Section */}
      <section id="latest-posts" className="mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Latest Posts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && <p>Loading latest posts...</p>}
          {!loading &&
            latestPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition cursor-pointer"
                onClick={() => handleFileClick(post.id)}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{post.name}</h3>
              </div>
            ))}
          {!loading && latestPosts.length === 0 && <p>No recent posts available.</p>}
        </div>
      </section>

      {/* Scroll to Top Button */}
      <button
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑ Top
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error}</p>}
    </div>
  );
}
