import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useGLTF, useTexture, useAnimations } from "@react-three/drei";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Dog = () => {
  const model = useGLTF("/models/dog.drc.glb");
  const dogModel = useRef(model);

  /* 🎥 Renderer & Camera setup */
  useThree(({ camera, gl }) => {
    camera.position.z = 0.7;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  });

  /* 🎞 Animations */
  const { actions } = useAnimations(model.animations, model.scene);

  useEffect(() => {
    actions?.["Take 001"]?.play();
  }, [actions]);

  /* 🧩 Textures */
  const [normalMap] = useTexture(["/dog_normals.jpg"]).map((t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return t;
  });

  const matcaps = useTexture(
    Array.from({ length: 20 }, (_, i) => `/matcap/mat-${i + 1}.png`)
  ).map((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

  const [
    mat2, mat8, mat9, mat10,
  , mat12, mat13, mat19
  ] = matcaps;

  /* 🎨 Shader uniforms */
  const material = useRef({
    uMatcap1: { value: mat2 },
    uMatcap2: { value: mat2 },
    uProgress: { value: 1.0 },
  });

  /* 🧱 Materials */
  const dogMaterial = new THREE.MeshMatcapMaterial({
    matcap: mat2,
    normalMap,
  });

  const branchMaterial = new THREE.MeshMatcapMaterial({ matcap: mat2 });

  const leafMaterial = new THREE.MeshMatcapMaterial({
    matcap: mat2,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x080402,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: 1.38,
    reflectivity: 0.6,
  });

  /* 🧠 Custom shader logic */
  const onBeforeCompile = (shader) => {
    shader.uniforms.uMatcapTexture1 = material.current.uMatcap1;
    shader.uniforms.uMatcapTexture2 = material.current.uMatcap2;
    shader.uniforms.uProgress = material.current.uProgress;
    shader.uniforms.uUseGradient = { value: 1 };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `
        uniform sampler2D uMatcapTexture1;
        uniform sampler2D uMatcapTexture2;
        uniform float uProgress;
        uniform float uUseGradient;
        void main() {
      `
      )
      .replace(
        "vec4 matcapColor = texture2D( matcap, uv );",
        `
        vec4 c1 = texture2D(uMatcapTexture1, uv);
        vec4 c2 = texture2D(uMatcapTexture2, uv);

        float p = uUseGradient > 0.5
          ? smoothstep(uProgress - 0.2, uProgress, (vViewPosition.x + vViewPosition.y) * 0.5 + 0.5)
          : 1.0;

        vec4 matcapColor = mix(c2, c1, p);
      `
      );
  };

  dogMaterial.onBeforeCompile = onBeforeCompile;
  branchMaterial.onBeforeCompile = onBeforeCompile;
  leafMaterial.onBeforeCompile = onBeforeCompile;

  /* 🐕 Assign materials */
  useEffect(() => {
    model.scene.traverse((child) => {
      if (!child.isMesh) return;

      if (child.name.includes("DOG_BODY")) child.material = dogMaterial;
      else if (child.name.includes("Reye") || child.name.includes("Leye"))
        child.material = eyeMaterial;
      else if (
        child.name.includes("hazel_leaf") ||
        child.name.includes("maple_leaf")
      )
        child.material = leafMaterial;
      else if (child.name.includes("branch"))
        child.material = branchMaterial;
    });
  }, [model]);

  /* 📜 Scroll animation */
  useGSAP(() => {
    gsap.timeline({
      scrollTrigger: {
        trigger: "#section-1",
        endTrigger: "#section-4",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    })
      .to(dogModel.current.scene.position, { z: "-=0.75", y: "+=0.1" })
      .to(dogModel.current.scene.rotation, { x: Math.PI / 15 })
      .to(
        dogModel.current.scene.rotation,
        { y: `-=${Math.PI}` },
        "third"
      )
      .to(
        dogModel.current.scene.position,
        { x: "-=0.5", z: "+=0.6", y: "-=0.05" },
        "third"
      );
  }, []);

  /* 🎯 Matcap hover interactions */
  useEffect(() => {
    const swap = (mat) => {
      material.current.uMatcap1.value = mat;
      gsap.to(material.current.uProgress, {
        value: 0,
        duration: 0.3,
        onComplete: () => {
          material.current.uMatcap2.value = mat;
          material.current.uProgress.value = 1;
        },
      });
    };

    document.querySelector(`.title[img-title="tomorrowland"]`)
      ?.addEventListener("mouseenter", () => swap(mat19));
    document.querySelector(`.title[img-title="navy-pier"]`)
      ?.addEventListener("mouseenter", () => swap(mat8));
    document.querySelector(`.title[img-title="msi-chicago"]`)
      ?.addEventListener("mouseenter", () => swap(mat9));
    document.querySelector(`.title[img-title="phone"]`)
      ?.addEventListener("mouseenter", () => swap(mat12));
    document.querySelector(`.title[img-title="kikk"]`)
      ?.addEventListener("mouseenter", () => swap(mat10));
    document.querySelector(`.title[img-title="kennedy"]`)
      ?.addEventListener("mouseenter", () => swap(mat8));
    document.querySelector(`.title[img-title="opera"]`)
      ?.addEventListener("mouseenter", () => swap(mat13));

    document.querySelector(`.titles`)
      ?.addEventListener("mouseleave", () => swap(mat2));
  }, );

  return (
    <>
      <primitive
        object={model.scene}
        position={[0.25, -0.55, 0]}
        rotation={[0, Math.PI / 3.9, 0]}
      />
      <directionalLight position={[0, 5, 5]} intensity={10} />
      <pointLight position={[0.15, 0.1, 1]} intensity={0.4} distance={2} />
    </>
  );
};

export default Dog;


