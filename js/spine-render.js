var lastFrameTime = Date.now() / 1000;
var canvas, context;
var assetManager;
var skeletons = {};
var activeSkeleton = 'spineboy';
var activeAnimation = 'run';
var skeletonRenderer;

function init() {
    canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context = canvas.getContext('2d');

    skeletonRenderer = new spine.canvas.SkeletonRenderer(context);
    // Enable debug rendering
    skeletonRenderer.debugRendering = false;
    // Enable the triangle renderer, supports meshes, but may produce artifacts in some browsers
    skeletonRenderer.triangleRendering = false;

    // Tell AssetManager to load the resources for each model, including the exported .skel file, the .atlas file and the .png
    // file for the atlas. We then wait until all resources are loaded in the load() method.
    assetManager = new spine.canvas.AssetManager();
    assetManager.loadText('../spineboy/' + activeSkeleton + '.json');
    assetManager.loadText('../spineboy/' + activeSkeleton + '.atlas');
    assetManager.loadTexture('../spineboy/' + activeSkeleton + '.png');

    requestAnimationFrame(load);
}

function load() {
    // Wait until the AssetManager has loaded all resources, then load the skeletons.
    if (assetManager.isLoadingComplete()) {
        skeletons[activeSkeleton] = loadSkeleton(activeSkeleton, activeAnimation, true);
        setupUI();
        requestAnimationFrame(render);
    } else {
        requestAnimationFrame(load);
    }
}

function loadSkeleton(name, initialAnimation, premultipliedAlpha, skin) {
    if (skin === undefined)
        skin = 'default';

    // Load the texture atlas using name.atlas and name.png from the AssetManager.
    let atlas = new spine.TextureAtlas(assetManager.get('../spineboy/' + name + '.atlas'), function(path) {
        return assetManager.get('../spineboy/' + path);
    });

    // Create a AtlasAttachmentLoader, which is specific to the WebGL backend.
    let atlasLoader = new spine.AtlasAttachmentLoader(atlas);

    // Create a SkeletonJson instance for parsing the .json file.
    let skeletonJson = new spine.SkeletonJson(atlasLoader);

    // Set the scale to apply during parsing, parse the file, and create a new skeleton
    let skeletonData = skeletonJson.readSkeletonData(assetManager.get('../spineboy/' + name + '.json'));
    let skeleton = new spine.Skeleton(skeletonData);
    skeleton.scaleY = -1;
    skeleton.setSkinByName(skin);

    // Calculate the bounds of skelton
    let bounds = calculateBounds(skeleton);

    // Create an AnimationState, and set the initial animation in looping mode
    let animationStateData = new spine.AnimationStateData(skeleton.data);
    let animationState = new spine.AnimationState(animationStateData);
    animationState.setAnimation(0, initialAnimation, true);
    animationState.addListener({
        start: function(track) {
            console.log('Animation on track ' + track.trackIndex + ' started');
        },
        interrupt: function(track) {
            console.log('Animation on track ' + track.trackIndex + ' interrupted');
        },
        end: function(track) {
            console.log('Animation on track ' + track.trackIndex + ' ended');
        }
    })

    // Pack everything up and return to caller
    return {
        skeleton: skeleton,
        state: animationState,
        bounds: bounds,
        premultipliedAlpha
    };
}

/* Calculate the bounds of skelton */
function calculateBounds(skeleton) {
    skeleton.setToSetupPose();
    skeleton.updateWorldTransform();

    let offset = new spine.Vector2();
    let size = new spine.Vector2();
    skeleton.getBounds(offset, size, []);
    return {
        offset: offset,
        size: size
    };
}

/* Setup controller UI */
function setupUI() {
    let setupAnimationUI = function() {
        let animationList = $('#animationList');
        animationList.empty();

        let currSkeleton = skeletons[activeSkeleton].skeleton;
        let currState = skeletons[activeSkeleton].state;
        let currSkelAnimations = currSkeleton.data.animations;
        let currAnimation = currState.tracks[0].animation.name;
        for (let i = 0; i < currSkelAnimations.length; ++i) {
            let name = currSkelAnimations[i].name;
            let option = $('<option></option>');
            option.attr('value', name).text(name);
            if (name === currAnimation) {
                option.attr('selected', 'selected');
            }
            animationList.append(option);

            // Set mix during changing each animations
            for (let j = 0; j < currSkelAnimations.length && i !== j; ++j) {
                let animaName1 = currSkelAnimations[i].name,
                    animaName2 = currSkelAnimations[j].name
                currState.data.setMix(animaName1, animaName2, 0.4)
            }
        }

        animationList.change(function() {
            let currSkeleton = skeletons[activeSkeleton].skeleton;
            currSkeleton.setToSetupPose();

            // Change into current active animation
            let currState = skeletons[activeSkeleton].state;
            let animationName = $('#animationList option:selected').text();
            currState.setAnimation(0, animationName, true);
        })
    }

    setupAnimationUI();
}

function render() {
    let now = Date.now() / 1000,
        delta = now - lastFrameTime;
    lastFrameTime = now;

    // Update the MVP matrix to adjust for canvas size changes
    resize();

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#cccccc';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    // Apply the animation state based on the delta time.
    let currState = skeletons[activeSkeleton].state;
    let currSkeleton = skeletons[activeSkeleton].skeleton;
    currState.update(delta);
    currState.apply(currSkeleton);
    currSkeleton.updateWorldTransform();
    skeletonRenderer.draw(currSkeleton);

    requestAnimationFrame(render);
}

function resize() {
    let w = canvas.clientWidth,
        h = canvas.clientHeight;
    let bounds = skeletons[activeSkeleton].bounds;
    if (canvas.width != w || canvas.height != h) {
        canvas.width = w;
        canvas.height = h;
    }

    let centerX = bounds.offset.x + bounds.size.x / 2,
        centerY = bounds.offset.y + bounds.size.y / 2;
    let scaleX = bounds.size.x / canvas.width,
        scaleY = bounds.size.y / canvas.height,
        scale = Math.max(scaleX, scaleY) * 1.2;
    if (scale < 1) {
        scale = 1;
    }
    let width = canvas.width * scale,
        height = canvas.height * scale;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(1 / scale, 1 / scale);
    context.translate(-centerX, -centerY);
    context.translate(width / 2, height / 2);
}

(function() {
    init();
}());